import type { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { FUNCTION_PATHS, PLATFORM_TREASURY_ADDRESS } from "@/lib/constants";
import supabase from "@/utils/supabase";
import type { Event, Whitelisting, WhitelistingInsert } from "@/types/database";
import { hashEmail, hashEmailToBytes } from "@/utils/hash";

/**
 * Create a transaction to create an event with default tiers
 * @param accountId - PopChainAccount object ID
 * @param name - Event name
 * @param description - Event description
 * @returns Transaction object
 */
export function createEventTransaction(
  accountId: string,
  name: string,
  description: string
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: FUNCTION_PATHS.EVENT_CREATE_WITH_DEFAULT_TIERS,
    arguments: [
      tx.object(accountId), // &mut PopChainAccount
      tx.pure.string(name), // string::String
      tx.pure.string(description), // string::String
      tx.object(PLATFORM_TREASURY_ADDRESS), // &mut PlatformTreasury
    ],
  });

  return tx;
}

/**
 * Fetch events for a specific organizer from Supabase with whitelist counts
 * @param organizerId - UUID of the organizer (from auth.users)
 * @returns Array of events with whitelistedCount
 */
export async function fetchOrganizerEvents(
  organizerId: string
): Promise<(Event & { whitelistedCount: number })[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events, error } = await (supabase.from("events") as any)
    .select("*")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error);
    throw error;
  }

  const typedEvents = (events || []) as Event[];

  if (typedEvents.length === 0) {
    return [];
  }

  // Fetch whitelist counts for all events
  const eventIds = typedEvents.map((event) => event.event_id);
  const { data: whitelistings, error: whitelistError } =
    await // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("whitelistings") as any)
      .select("event_id")
      .in("event_id", eventIds);

  if (whitelistError) {
    console.error("Error fetching whitelistings:", whitelistError);
    // Return events with 0 count if whitelistings fetch fails
    return typedEvents.map((event) => ({
      ...event,
      whitelistedCount: 0,
    }));
  }

  // Count whitelistings per event
  const countsByEventId = new Map<string, number>();
  if (whitelistings && Array.isArray(whitelistings)) {
    for (const whitelisting of whitelistings as Array<{ event_id: string }>) {
      const currentCount = countsByEventId.get(whitelisting.event_id) || 0;
      countsByEventId.set(whitelisting.event_id, currentCount + 1);
    }
  }

  // Combine events with their counts
  return typedEvents.map((event) => ({
    ...event,
    whitelistedCount: countsByEventId.get(event.event_id) || 0,
  }));
}

/**
 * Decode Sui string (stored as vector<u8> bytes)
 * @param bytes - Base64 encoded bytes or byte array
 * @returns Decoded string
 */
function decodeSuiString(bytes: unknown): string {
  if (typeof bytes === "string") {
    try {
      // If it's a base64 string, decode it
      const decoded = atob(bytes);
      return decoded;
    } catch {
      // If it's already a string, return as-is
      return bytes;
    }
  }

  // Handle nested structure: { fields: { bytes: string } }
  if (
    bytes &&
    typeof bytes === "object" &&
    "fields" in bytes &&
    typeof bytes.fields === "object" &&
    bytes.fields !== null &&
    "bytes" in bytes.fields
  ) {
    const byteString = (bytes.fields as { bytes: unknown }).bytes;
    if (typeof byteString === "string") {
      try {
        return atob(byteString);
      } catch {
        return byteString;
      }
    }
  }

  return "";
}

/**
 * Fetch event details from blockchain
 * The Event object has a whitelist Table, but querying table size directly
 * from Sui requires more complex queries. For now, we'll return basic info.
 * @param eventId - Event object ID from blockchain
 * @param suiClient - SuiClient instance
 * @returns Event data from blockchain or null if not found
 */
export async function getEventFromBlockchain(
  eventId: string,
  suiClient: SuiClient
): Promise<{
  active: boolean;
  name: string;
  description: string;
  organizer: string;
} | null> {
  try {
    const object = await suiClient.getObject({
      id: eventId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!object.data || object.error || !("content" in object.data)) {
      return null;
    }

    const content = object.data.content;
    if (content && "fields" in content) {
      const fields = content.fields as Record<string, unknown>;

      return {
        active: (fields.active as boolean) ?? false,
        name: decodeSuiString(fields.name),
        description: decodeSuiString(fields.description),
        organizer: (fields.organizer as string) || "",
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching event from blockchain:", error);
    return null;
  }
}

/**
 * Create a transaction to add an email to event whitelist
 * @param eventId - Event object ID from blockchain
 * @param email - Email address to whitelist
 * @returns Transaction object
 */
export function createAddToWhitelistTransaction(
  eventId: string,
  email: string
): Transaction {
  const tx = new Transaction();
  const emailHashBytes = hashEmailToBytes(email);

  tx.moveCall({
    target: FUNCTION_PATHS.EVENT_ADD_TO_WHITELIST,
    arguments: [
      tx.object(eventId), // &mut Event
      tx.pure.vector("u8", emailHashBytes), // vector<u8> email_hash
    ],
  });

  return tx;
}

/**
 * Whitelist a single email address for an event
 * @param eventId - Event object ID from blockchain
 * @param email - Email address to whitelist
 * @param suiClient - SuiClient instance
 * @param signAndExecute - Function to sign and execute transaction
 * @returns Success status and transaction digest
 */
// THIS SHOULD BE A BULK WHITELISTING FUNCTION NEXT TIME :) - barysh
export async function whitelistEmail(
  eventId: string,
  email: string,
  suiClient: SuiClient,
  signAndExecute: (params: {
    transaction: Transaction;
  }) => Promise<{ digest: string }>
): Promise<{ success: boolean; digest?: string; error?: string }> {
  try {
    const tx = createAddToWhitelistTransaction(eventId, email);
    const result = await signAndExecute({ transaction: tx });

    // Wait for transaction
    await suiClient.waitForTransaction({
      digest: result.digest,
    });

    // Store in Supabase
    const emailHash = hashEmail(email);
    // Normalize hash: lowercase and trim to ensure consistent matching
    const normalizedHash = emailHash.toLowerCase().trim();
    const whitelistingData: WhitelistingInsert = {
      event_id: eventId,
      email,
      email_hash: normalizedHash,
    };

    const { error: dbError } =
      await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("whitelistings") as any).insert(whitelistingData);

    if (dbError) {
      console.error("Error storing whitelisting in database:", dbError);
      // Still return success since on-chain whitelisting succeeded
    }

    return { success: true, digest: result.digest };
  } catch (error) {
    console.error("Error whitelisting email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch an event by ID from Supabase
 * @param eventId - Event ID to fetch
 * @returns Event data or null if not found
 */
export async function fetchEventById(eventId: string): Promise<Event | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("events") as any)
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (error) {
    console.error("Error fetching event:", error);
    return null;
  }

  return data as Event;
}

/**
 * Whitelisting with associated user name from user_profiles
 */
export interface WhitelistingWithName extends Whitelisting {
  name?: string; // First name + last name if matched in user_profiles
}

/**
 * Fetch whitelistings for an event and match them with user profile names
 * @param eventId - Event ID to fetch whitelistings for
 * @returns Array of whitelistings with optional name field
 */
export async function fetchWhitelistingsWithNames(
  eventId: string
): Promise<WhitelistingWithName[]> {
  // Fetch whitelistings for this event
  const { data: whitelistings, error: whitelistError } =
    await // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("whitelistings") as any)
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

  if (whitelistError || !whitelistings) {
    console.error("Error fetching whitelistings:", whitelistError);
    return [];
  }

  const typedWhitelistings = whitelistings as Whitelisting[];

  // Get all unique email hashes from whitelistings (normalize to lowercase and trim)
  const emailHashes = Array.from(
    new Set(
      typedWhitelistings
        .map((w) => (w.email_hash || "").toLowerCase().trim())
        .filter(Boolean)
    )
  );

  if (emailHashes.length === 0) {
    return typedWhitelistings.map((w) => ({ ...w, name: undefined }));
  }

  // Fetch ALL user profiles and match in JavaScript for more reliable matching
  // This avoids potential issues with Supabase's .in() query not finding matches
  const { data: allProfiles, error: profilesError } =
    await // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("user_profiles") as any).select(
      "email_hash, first_name, last_name"
    );

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
  }

  // Create a Set for fast lookup of whitelisting hashes
  const emailHashSet = new Set(emailHashes);

  // Create a map of email_hash -> name (normalized to lowercase)
  // Match by normalizing both sides and only include profiles that match our whitelistings
  const nameMap = new Map<string, string>();

  if (allProfiles && Array.isArray(allProfiles)) {
    for (const profile of allProfiles as Array<{
      email_hash: string;
      first_name: string;
      last_name: string;
    }>) {
      // Normalize hash: lowercase and trim
      const normalizedHash = (profile.email_hash || "").toLowerCase().trim();

      // Only add to map if this hash is in our whitelistings set (and not already added)
      if (
        normalizedHash &&
        emailHashSet.has(normalizedHash) &&
        !nameMap.has(normalizedHash)
      ) {
        const fullName = `${profile.first_name || ""} ${
          profile.last_name || ""
        }`.trim();

        // Add to map even if name is empty - we'll show email or "Registered" as fallback
        // This ensures we know the profile exists even without a name
        if (fullName) {
          nameMap.set(normalizedHash, fullName);
        } else {
          // Mark as registered even without name (use a special marker)
          nameMap.set(normalizedHash, "Registered"); // Special marker for registered but no name
        }
      }
    }
  }

  // Combine whitelistings with names (normalize hash for lookup)
  return typedWhitelistings.map((whitelisting) => {
    // Normalize hash: lowercase and trim
    const normalizedHash = (whitelisting.email_hash || "").toLowerCase().trim();
    const matchedName = normalizedHash
      ? nameMap.get(normalizedHash)
      : undefined;

    return {
      ...whitelisting,
      name: matchedName,
    };
  });
}

/**
 * Parse a CSV file and extract email addresses
 * @param file - CSV file to parse
 * @returns Array of valid email addresses
 */
export async function parseCSV(file: File): Promise<string[]> {
  const text = await file.text();
  const lines = text.split("\n");
  const emails: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Handle CSV format - emails might be in first column
    const parts = trimmed.split(",");
    const email = parts[0]?.trim().toLowerCase();

    // Basic email validation
    if (email && email.includes("@") && email.includes(".")) {
      emails.push(email);
    }
  }

  return emails;
}

/**
 * Progress tracking for bulk whitelisting operations
 */
export interface WhitelistingProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
}

/**
 * Callback type for progress updates during bulk whitelisting
 */
export type ProgressCallback = (progress: WhitelistingProgress) => void;

/**
 * Whitelist multiple emails from a CSV file
 * @param eventId - Event ID to whitelist emails for
 * @param file - CSV file containing email addresses
 * @param suiClient - SuiClient instance
 * @param signAndExecute - Function to sign and execute transactions
 * @param onProgress - Optional callback for progress updates
 * @returns Final progress state
 */
export async function whitelistCSVEmails(
  eventId: string,
  file: File,
  suiClient: SuiClient,
  signAndExecute: (params: {
    transaction: Transaction;
  }) => Promise<{ digest: string }>,
  onProgress?: ProgressCallback
): Promise<WhitelistingProgress> {
  // Parse CSV
  const emails = await parseCSV(file);

  if (emails.length === 0) {
    throw new Error("No valid emails found in CSV file");
  }

  const progress: WhitelistingProgress = {
    total: emails.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
  };

  // Whitelist each email sequentially
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    try {
      const result = await whitelistEmail(
        eventId,
        email,
        suiClient,
        signAndExecute
      );

      if (result.success) {
        progress.succeeded++;
      } else {
        progress.failed++;
      }
    } catch (error) {
      progress.failed++;
      console.error(`Error whitelisting ${email}:`, error);
    }

    progress.processed = i + 1;
    onProgress?.(progress);

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return progress;
}
