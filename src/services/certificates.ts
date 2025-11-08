import supabase, { supabaseAdmin } from "@/utils/supabase";
import type { Certificate, CertificateInsert } from "@/types/database";
import {
  getTierByName,
  getTierImageUrl,
  getTierIndex,
  type TierName,
} from "@/lib/certificate-tiers";
import type { SuiClient } from "@mysten/sui/client";
import { CONTRACT_PACKAGE_ID } from "@/lib/constants";
import { getFilePublicUrl, uploadImageToTusky, deleteImageFromTusky } from "./tusky";

/**
 * Extracts the blobId from a Tusky URL.
 * @param url The Tusky URL.
 * @returns The blobId.
 */
const extractBlobIdFromUrl = (url: string) => {
    try {
        const urlObject = new URL(url);
        return urlObject.pathname.substring(1); // Remove the leading '/'
    } catch (error) {
        console.error("Invalid URL provided to extractBlobIdFromUrl");
        return null;
    }
}

/**
 * Certificate object structure from blockchain
 */
interface BlockchainCertificate {
  objectId: string;
  eventId: string;
  certificateUrlHash: string;
  tier: {
    name: string;
    level: string;
    description: string;
    imageUrl: string;
  };
  ownerAddress: string;
}

/**
 * Get all certificates owned by an address (including 0x0 for PopChainAccount-linked certificates)
 * @param ownerAddress - Address that owns the certificates (use "0x0" for PopChainAccount-linked)
 * @param suiClient - SuiClient instance
 * @returns Array of certificate object IDs
 */
export async function getCertificatesByOwner(
  ownerAddress: string,
  suiClient: SuiClient
): Promise<string[]> {
  try {
    const certificateType = `${CONTRACT_PACKAGE_ID}::popchain_certificate::Certificate`;

    // Get all objects owned by the address with Certificate type
    const objects = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: certificateType,
      },
      options: {
        showContent: true,
        showType: true,
      },
    });

    return (
      objects.data
        ?.map((obj) => obj.data?.objectId)
        .filter((id): id is string => !!id) || []
    );
  } catch (error) {
    console.error("Error fetching certificates from blockchain:", error);
    return [];
  }
}

/**
 * Get certificate object details from blockchain
 * @param certificateId - Certificate object ID
 * @param suiClient - SuiClient instance
 * @returns Certificate details or null if not found
 */
export async function getCertificateFromBlockchain(
  certificateId: string,
  suiClient: SuiClient
): Promise<BlockchainCertificate | null> {
  try {
    const object = await suiClient.getObject({
      id: certificateId,
      options: {
        showContent: true,
        showType: true,
        showOwner: true, // Explicitly request owner information
      },
    });

    if (!object.data || object.error || !("content" in object.data)) {
      return null;
    }

    const content = object.data.content;
    if (content && "fields" in content) {
      const fields = content.fields as Record<string, unknown>;

      // Decode Sui Move strings (Vec<u8>) to regular strings
      const decodeSuiString = (bytes: unknown): string => {
        if (typeof bytes === "string") {
          return bytes;
        }
        if (Array.isArray(bytes)) {
          try {
            const uint8Array = new Uint8Array(bytes);
            return new TextDecoder().decode(uint8Array);
          } catch {
            return "";
          }
        }
        // Handle nested structure: { fields: { bytes: string } }
        if (
          bytes &&
          typeof bytes === "object" &&
          bytes !== null &&
          "fields" in bytes
        ) {
          const bytesObj = bytes as Record<string, unknown>;
          if (
            typeof bytesObj.fields === "object" &&
            bytesObj.fields !== null &&
            "bytes" in bytesObj.fields
          ) {
            const fieldsObj = bytesObj.fields as Record<string, unknown>;
            const byteString = fieldsObj.bytes;
            if (typeof byteString === "string") {
              try {
                return atob(byteString);
              } catch {
                return byteString;
              }
            }
          }
        }
        return "";
      };

      // Extract tier information - based on actual structure:
      // tier_name, tier_url are direct fields, not nested in a tier object
      let tier = {
        name: "",
        level: "",
        description: "",
        imageUrl: "",
      };

      // Extract tier_name
      const tierName =
        decodeSuiString(fields.tier_name) || (fields.tier_name as string) || "";

      // Extract tier_url (tier image URL)
      const tierUrl =
        decodeSuiString(fields.tier_url) || (fields.tier_url as string) || "";

      // Get tier details from our tier definitions
      const tierDefinition = getTierByName(tierName as TierName);

      if (tierDefinition) {
        tier = {
          name: tierName,
          level: tierDefinition.level,
          description: tierDefinition.description,
          imageUrl: tierUrl || getTierImageUrl(tierDefinition),
        };
      } else {
        // Fallback if tier definition not found
        tier = {
          name: tierName,
          level: "",
          description: "",
          imageUrl: tierUrl,
        };
      }

      // Extract event_id (handle nested id structure: { id: { id: "0x..." } })
      let eventId = "";
      if (fields.event_id) {
        if (typeof fields.event_id === "string") {
          eventId = fields.event_id;
        } else if (
          typeof fields.event_id === "object" &&
          fields.event_id !== null
        ) {
          const idObj = fields.event_id as Record<string, unknown>;
          if (idObj.id && typeof idObj.id === "object" && idObj.id !== null) {
            const nestedId = idObj.id as Record<string, unknown>;
            if (nestedId.id && typeof nestedId.id === "string") {
              eventId = nestedId.id;
            }
          } else if (idObj.id && typeof idObj.id === "string") {
            eventId = idObj.id;
          }
        }
      }

      // Extract certificate URL (stored as 'url' field)
      const certificateUrl =
        decodeSuiString(fields.url) || (fields.url as string) || "";

      // Get owner address - handle all possible owner formats
      let ownerAddress = "0x0";

      if (object.data && "owner" in object.data) {
        const owner = object.data.owner;

        if (typeof owner === "string") {
          // Direct string owner (shouldn't happen in Sui, but handle it)
          ownerAddress = owner;
        } else if (owner && typeof owner === "object") {
          // Handle different owner types in Sui
          if ("AddressOwner" in owner) {
            // Owned by an address
            ownerAddress = (owner as { AddressOwner: string }).AddressOwner;
          } else if ("ObjectOwner" in owner) {
            // Owned by an object (like PopChainAccount)
            ownerAddress = (owner as { ObjectOwner: string }).ObjectOwner;
          } else if ("Shared" in owner) {
            // Shared object
            ownerAddress = "Shared";
          } else if ("Immutable" in owner) {
            // Immutable object
            ownerAddress = "Immutable";
          } else {
            // Fallback: try to extract address from any property
            // Sometimes the structure might be nested differently
            const ownerObj = owner as Record<string, unknown>;
            for (const key of Object.keys(ownerObj)) {
              const value = ownerObj[key];
              if (typeof value === "string" && value.startsWith("0x")) {
                ownerAddress = value;
                break;
              }
            }
          }
        }
      }

      return {
        objectId: certificateId,
        eventId: eventId,
        certificateUrlHash: certificateUrl, // Store the actual URL, not hash
        tier,
        ownerAddress,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching certificate from blockchain:", error);
    return null;
  }
}

/**
 * Get certificates from PopChainAccount object
 * @param popchainAccountId - PopChainAccount object ID
 * @param suiClient - SuiClient instance
 * @returns Array of certificate object IDs or empty array
 */
async function getCertificatesFromPopChainAccount(
  popchainAccountId: string,
  suiClient: SuiClient
): Promise<string[]> {
  try {
    const account = await suiClient.getObject({
      id: popchainAccountId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!account.data || account.error || !("content" in account.data)) {
      return [];
    }

    const content = account.data.content;
    if (content && "fields" in content) {
      const fields = content.fields as Record<string, unknown>;

      // Check if certificates field exists
      if (fields.certificates) {
        if (Array.isArray(fields.certificates)) {
          return fields.certificates.filter(
            (id): id is string => typeof id === "string"
          );
        }
        // Handle if it's stored differently (e.g., as a Vec)
        if (
          typeof fields.certificates === "object" &&
          fields.certificates !== null
        ) {
          const certObj = fields.certificates as Record<string, unknown>;
          if ("vec" in certObj && Array.isArray(certObj.vec)) {
            return certObj.vec.filter(
              (id): id is string => typeof id === "string"
            );
          }
        }
      }
    }

    return [];
  } catch (error) {
    console.error("Error fetching certificates from PopChainAccount:", error);
    return [];
  }
}

/**
 * Get all certificates for a PopChainAccount
 * Certificates are owned by either the wallet address or stored in the PopChainAccount
 * @param popchainAccountId - PopChainAccount object ID
 * @param walletAddress - Optional wallet address (if linked)
 * @param suiClient - SuiClient instance
 * @returns Array of certificate object IDs
 */
export async function getCertificatesForAccount(
  popchainAccountId: string,
  walletAddress: string | null,
  suiClient: SuiClient
): Promise<string[]> {
  const certificateIds: string[] = [];

  // Get certificates owned by wallet address (if wallet is linked)
  if (walletAddress && walletAddress !== "0x0") {
    try {
      const walletCertificates = await getCertificatesByOwner(
        walletAddress,
        suiClient
      );
      certificateIds.push(...walletCertificates);
    } catch (error) {
      console.warn("Error fetching certificates from wallet address:", error);
    }
  }

  // Try to get certificates from PopChainAccount object
  try {
    const accountCertificates = await getCertificatesFromPopChainAccount(
      popchainAccountId,
      suiClient
    );
    certificateIds.push(...accountCertificates);
  } catch (error) {
    console.warn("Error fetching certificates from PopChainAccount:", error);
  }

  // Remove duplicates
  return [...new Set(certificateIds)];
}

/**
 * Validate image dimensions
 * @param file - File to validate
 * @param allowedDimensions - Array of allowed [width, height] pairs
 * @returns Promise<boolean> - true if valid
 */
export async function validateImageDimensions(
  file: File,
  allowedDimensions: Array<[number, number]>
): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.width;
      const height = img.height;

      const isValid = allowedDimensions.some(
        ([w, h]) => width === w && height === h
      );

      resolve(isValid);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };

    img.src = url;
  });
}

/**
 * Default certificate option with index and URL
 */
export interface DefaultCertificateOption {
  index: number; // 1-8
  name: string; // "cert-1.png", "cert-2.png", etc.
  url: string;
}

/**
 * Get default certificate URLs from Tusky.
 * This function requires the blobIds for the default certificate images to be provided.
 * @returns Array of default certificate options with URLs.
 */
export function getDefaultCertificateOptions(): DefaultCertificateOption[] {
  const defaultCertificateBlobIds = [
    "MTYP_J8S3Sx01ngH-rlaUu1oJ33gb3zNfnE2ckAgUcI",
    "8sYZBOrzrhQji83nXXoe_WoS-zsueuDNRGxnGfK3Q8c",
    "k-6h5Q0vZipxhJCGTWcD8yimhqaIs9bCzww7n-mhUac",
    "VemrLWIut-z8-0Wol2WS8LrLQY39I3Bx6MeZww83raA",
    "bDgpXTwlDdh4aA1CT976ubMUsc1YOORb5TTHIW4VZjo",
    "ZEJ0u4jWPWhYMWJLig0GngbyliX8GKyk2ZUTBARKLu0",
    "wiUMCiW1k6nM2eIwX28KuAKoHavQZZDc8h6fYz2j-Q0",
    "peXNPHOChiCsHlC6EcZglwAAn8X7I7jQix89tx3u7cY",
  ];

  return defaultCertificateBlobIds.map((blobId, index) => ({
    index: index + 1,
    name: `cert-${index + 1}.png`,
    url: getFilePublicUrl(blobId),
  }));
}

/**
 * Get tier image URL from Tusky
 * @param tierName - Tier name
 * @returns Public URL to tier image
 */
export function getTierImageUrlByName(tierName: TierName): string {
  const tier = getTierByName(tierName);
  if (!tier) {
    throw new Error(`Invalid tier name: ${tierName}`);
  }
  return getTierImageUrl(tier);
}

/**
 * Upload a custom certificate image to Tusky.
 * @param file - Image file to upload (suggested sizes: 1920x1080 or 1080x1920)
 * @returns Promise with public URL of uploaded image.
 */
export async function uploadCertificateImage(
  file: File
): Promise<string> {
  // Validate file is an image
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  return await uploadImageToTusky(file);
}

/**
 * Create a certificate record in the database
 * Uses admin client to bypass RLS
 * @param certificateData - Certificate data to insert
 * @returns Promise with created certificate
 */
export async function createCertificate(
  certificateData: CertificateInsert
): Promise<Certificate> {
  if (!supabaseAdmin) {
    throw new Error(
      "Service role key not configured. Please set VITE_SERVICE_ROLE_KEY"
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin.from("certificates") as any)
    .insert(certificateData)
    .select()
    .single();

  if (error) {
    console.error("Error creating certificate:", error);
    throw new Error(`Failed to create certificate: ${error.message}`);
  }

  return data as Certificate;
}

/**
 * Fetch a certificate by ID
 * @param certificateId - Certificate ID to fetch
 * @returns Promise with certificate or null if not found
 */
export async function fetchCertificateById(
  certificateId: string
): Promise<Certificate | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("certificates") as any)
    .select("*")
    .eq("id", certificateId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error("Error fetching certificate:", error);
    throw new Error(`Failed to fetch certificate: ${error.message}`);
  }

  return data as Certificate;
}

/**
 * Fetch all certificates for an event
 * @param eventId - Event ID to fetch certificates for
 * @returns Promise with array of certificates
 */
export async function fetchCertificatesByEventId(
  eventId: string
): Promise<Certificate[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("certificates") as any)
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching certificates:", error);
    throw new Error(`Failed to fetch certificates: ${error.message}`);
  }

  return (data || []) as Certificate[];
}

/**
 * Create certificate from default layout
 * @param defaultLayoutUrl - URL of the default certificate layout
 * @param defaultLayoutIndex - Index of the default layout (1-8)
 * @param eventId - Event ID
 * @param userId - User ID
 * @param tierName - Tier name for this certificate
 * @param name - Optional name for the certificate
 * @returns Promise with created certificate
 */
export async function createCertificateFromDefault(
  defaultLayoutUrl: string,
  defaultLayoutIndex: number,
  eventId: string,
  userId: string,
  tierName: TierName,
  name?: string
): Promise<Certificate> {
  const tier = getTierByName(tierName);
  if (!tier) {
    throw new Error(`Invalid tier name: ${tierName}`);
  }

  const tierImageUrl = getTierImageUrl(tier);
  const tierIndex = getTierIndex(tierName);

  const certificateData: CertificateInsert = {
    event_id: eventId,
    user_id: userId,
    image_url: defaultLayoutUrl,
    name: name || `Default Certificate ${defaultLayoutIndex}`,
    is_default: true,
    tier_name: tier.name,
    tier_index: tierIndex,
    tier_level: tier.level,
    tier_description: tier.description,
    tier_image_url: tierImageUrl,
  };

  return createCertificate(certificateData);
}

/**
 * Upload a custom certificate and create a database record
 * @param file - Image file to upload
 * @param eventId - Event ID
 * @param userId - User ID
 * @param tierName - Tier name for this certificate
 * @param name - Optional name for the certificate
 * @returns Promise with created certificate
 */
export async function uploadAndCreateCertificate(
  file: File,
  eventId: string,
  userId: string,
  tierName: TierName,
  name?: string
): Promise<Certificate> {
  const tier = getTierByName(tierName);
  if (!tier) {
    throw new Error(`Invalid tier name: ${tierName}`);
  }

  // Upload image to Tusky
  const imageUrl = await uploadCertificateImage(file);

  const tierImageUrl = getTierImageUrl(tier);
  const tierIndex = getTierIndex(tierName);

  // Create database record
  const certificateData: CertificateInsert = {
    event_id: eventId,
    user_id: userId,
    image_url: imageUrl,
    name: name || null,
    is_default: false,
    tier_name: tier.name,
    tier_index: tierIndex,
    tier_level: tier.level,
    tier_description: tier.description,
    tier_image_url: tierImageUrl,
  };

  return createCertificate(certificateData);
}

/**
 * Delete a certificate (removes from database and Tusky)
 * @param certificateId - Certificate ID to delete
 * @returns Promise<void>
 */
export async function deleteCertificate(certificateId: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error(
      "Service role key not configured. Please set VITE_SERVICE_ROLE_KEY"
    );
  }

  // First, fetch the certificate to get the image URL
  const certificate = await fetchCertificateById(certificateId);
  if (!certificate) {
    console.warn(`Certificate with ID ${certificateId} not found. Cannot delete.`);
    return;
  }

  // Delete from database
  const { error: dbError } = await supabaseAdmin
    .from("certificates")
    .delete()
    .eq("id", certificateId);

  if (dbError) {
    console.error("Error deleting certificate from database:", dbError);
    throw new Error(`Failed to delete certificate from database: ${dbError.message}`);
  }

  // If the image is not a default image, delete it from Tusky
  if (!certificate.is_default) {
    const blobId = extractBlobIdFromUrl(certificate.image_url);
    if (blobId) {
      try {
        await deleteImageFromTusky(blobId);
      } catch (tuskyError) {
        console.error(`Failed to delete image from Tusky: ${tuskyError}`);
        // Optional: Decide if you want to re-throw or handle this case
      }
    }
  }
}
