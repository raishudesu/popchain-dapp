import type { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { FUNCTION_PATHS, PLATFORM_TREASURY_ADDRESS } from "@/lib/constants";
import supabase from "@/utils/supabase";
import type { Event } from "@/types/database";

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
 * Fetch events for a specific organizer from Supabase
 * @param organizerId - UUID of the organizer (from auth.users)
 * @returns Array of events
 */
export async function fetchOrganizerEvents(
  organizerId: string
): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error);
    throw error;
  }

  return data || [];
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
