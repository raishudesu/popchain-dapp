import type { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { FUNCTION_PATHS, PLATFORM_TREASURY_ADDRESS } from "@/lib/constants";
import type { Certificate } from "@/types/database";
import { fetchEventById, getEventFromBlockchain } from "./events";
import { getServiceWallet, getSuiClient } from "./sponsored-transaction";

/**
 * Create a transaction to mint a certificate for an attendee
 * @param eventId - Event object ID from blockchain
 * @param organizerAccountId - Organizer's PopChainAccount object ID
 * @param attendeeAccountId - Attendee's PopChainAccount object ID
 * @param certificateUrl - URL of the certificate image (will be hashed by the entry function)
 * @param tierIndex - Tier index (0-3)
 * @returns Transaction object
 */
export function createMintCertificateTransaction(
  eventId: string,
  organizerAccountId: string,
  attendeeAccountId: string,
  certificateUrl: string,
  tierIndex: number
): Transaction {
  const tx = new Transaction();
  // Convert URL string to UTF-8 bytes - the entry function will handle hashing internally
  const certificateUrlBytes = new TextEncoder().encode(certificateUrl);

  tx.moveCall({
    target: FUNCTION_PATHS.EVENT_MINT_CERTIFICATE,
    arguments: [
      tx.object(eventId), // &mut Event
      tx.object(organizerAccountId), // &mut PopChainAccount (organizer)
      tx.object(attendeeAccountId), // &mut PopChainAccount (attendee)
      tx.pure.vector("u8", Array.from(certificateUrlBytes)), // vector<u8> certificate_url_hash (entry function hashes internally)
      tx.pure.u64(tierIndex), // u64 tier_index
      tx.object(PLATFORM_TREASURY_ADDRESS), // &mut PlatformTreasury
    ],
  });

  return tx;
}

/**
 * Mint a certificate for an attendee using sponsored transaction (service wallet signs)
 * The organizer's PopChainAccount will be charged the fee via charge_platform_fee
 * @param certificate - Certificate data from database
 * @param organizerAccountId - Organizer's PopChainAccount object ID
 * @param attendeeAccountId - Attendee's PopChainAccount object ID
 * @param suiClient - SuiClient instance (optional, will use getSuiClient if not provided)
 * @returns Success status and transaction digest
 */
export async function mintCertificateForAttendeeSponsored(
  certificate: Certificate,
  organizerAccountId: string,
  attendeeAccountId: string,
  suiClient?: SuiClient
): Promise<{ success: boolean; digest?: string; error?: string }> {
  try {
    // Verify certificate has all required data
    if (!certificate.event_id) {
      throw new Error("Certificate missing event_id");
    }
    if (
      certificate.tier_index === undefined ||
      certificate.tier_index === null
    ) {
      throw new Error("Certificate missing tier_index");
    }
    if (!certificate.image_url) {
      throw new Error("Certificate missing image_url");
    }

    // Get service wallet (package owner - sponsors gas fees)
    const serviceWallet = getServiceWallet();
    if (!serviceWallet) {
      return {
        success: false,
        error:
          "Service wallet not configured. VITE_SERVICE_WALLET_PRIVATE_KEY must be set.",
      };
    }

    // Use provided client or get default
    const client = suiClient || getSuiClient();

    // Create transaction
    const tx = createMintCertificateTransaction(
      certificate.event_id,
      organizerAccountId,
      attendeeAccountId,
      certificate.image_url,
      certificate.tier_index
    );

    // Sign and execute using service wallet (package owner sponsors the transaction)
    // Note: The smart contract requires sender == event.organizer, so the service wallet
    // must match the organizer's address, or the contract must allow package owner to call this
    const result = await client.signAndExecuteTransaction({
      signer: serviceWallet,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    // Wait for transaction
    await client.waitForTransaction({
      digest: result.digest,
    });

    return { success: true, digest: result.digest };
  } catch (error) {
    console.error("Error minting certificate:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check for common errors
    if (errorMessage.includes("notExists")) {
      return {
        success: false,
        error: `Object not found. The organizer account or event might not exist on-chain. Please verify the organizer account ID: ${organizerAccountId}`,
      };
    }

    if (
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("sender")
    ) {
      return {
        success: false,
        error:
          `Transaction unauthorized. The smart contract requires sender == event.organizer. ` +
          `The service wallet address must match the event organizer's address, ` +
          `or the contract needs to be updated to allow the package owner to call this function.`,
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Mint a certificate for an attendee (using user's wallet - for backwards compatibility)
 * @param certificate - Certificate data from database
 * @param organizerAccountId - Organizer's PopChainAccount object ID
 * @param attendeeAccountId - Attendee's PopChainAccount object ID
 * @param suiClient - SuiClient instance
 * @param signAndExecute - Function to sign and execute transaction
 * @returns Success status and transaction digest
 */
export async function mintCertificateForAttendee(
  certificate: Certificate,
  organizerAccountId: string,
  attendeeAccountId: string,
  suiClient: SuiClient,
  signAndExecute: (params: {
    transaction: Transaction;
  }) => Promise<{ digest: string }>
): Promise<{ success: boolean; digest?: string; error?: string }> {
  try {
    // Verify certificate has all required data
    if (!certificate.event_id) {
      throw new Error("Certificate missing event_id");
    }
    if (
      certificate.tier_index === undefined ||
      certificate.tier_index === null
    ) {
      throw new Error("Certificate missing tier_index");
    }
    if (!certificate.image_url) {
      throw new Error("Certificate missing image_url");
    }

    // Create transaction
    const tx = createMintCertificateTransaction(
      certificate.event_id,
      organizerAccountId,
      attendeeAccountId,
      certificate.image_url,
      certificate.tier_index
    );

    // Execute transaction
    const result = await signAndExecute({ transaction: tx });

    // Wait for transaction
    await suiClient.waitForTransaction({
      digest: result.digest,
    });

    return { success: true, digest: result.digest };
  } catch (error) {
    console.error("Error minting certificate:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get event and organizer account information for a certificate
 * @param certificate - Certificate data
 * @param suiClient - SuiClient instance (optional, for blockchain fallback)
 * @returns Event data and organizer account ID, or null if not found
 */
export async function getCertificateMintingData(
  certificate: Certificate,
  suiClient?: SuiClient
): Promise<{
  eventId: string;
  organizerAccountId: string;
} | null> {
  // Try fetching event from database first
  let organizerAccountId: string | null = null;

  try {
    const event = await fetchEventById(certificate.event_id);
    if (event) {
      organizerAccountId = event.organizer_account_address;
    }
  } catch (error) {
    // Database fetch failed (might be RLS issue), try blockchain
    console.warn(
      "Failed to fetch event from database, trying blockchain:",
      error
    );
  }

  // If database fetch failed or didn't return organizer, try blockchain
  if (!organizerAccountId && suiClient) {
    try {
      const blockchainEvent = await getEventFromBlockchain(
        certificate.event_id,
        suiClient
      );
      if (blockchainEvent && blockchainEvent.organizer) {
        // The organizer field from blockchain is the PopChainAccount address
        organizerAccountId = blockchainEvent.organizer;
      }
    } catch (error) {
      console.error("Failed to fetch event from blockchain:", error);
    }
  }

  if (!organizerAccountId) {
    return null;
  }

  return {
    eventId: certificate.event_id,
    organizerAccountId,
  };
}
