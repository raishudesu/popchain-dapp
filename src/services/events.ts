import type { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { FUNCTION_PATHS, PLATFORM_TREASURY_ADDRESS } from "@/lib/constants";
import supabase from "@/utils/supabase";
import type { Event, WhitelistingInsert } from "@/types/database";
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
    const whitelistingData: WhitelistingInsert = {
      event_id: eventId,
      email,
      email_hash: emailHash,
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
