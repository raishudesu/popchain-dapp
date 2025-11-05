import type { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { FUNCTION_PATHS, PLATFORM_TREASURY_ADDRESS } from "@/lib/constants";
import supabase from "@/utils/supabase";
import type { Event, Whitelisting, WhitelistingInsert } from "@/types/database";
import { hashEmail, hashEmailToBytes } from "@/utils/hash";
import { popchainErrorDecoder } from "@/utils/errors";

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
 * @param bytes - Base64 encoded bytes, byte array, or nested structure
 * @returns Decoded string
 */
function decodeSuiString(bytes: unknown): string {
  if (bytes == null) return "";

  // If already a Buffer, Uint8Array, or Array of numbers → decode as UTF-8
  if (bytes instanceof Uint8Array || Array.isArray(bytes)) {
    return new TextDecoder("utf-8").decode(Uint8Array.from(bytes));
  }

  if (typeof bytes === "string") {
    let str = bytes;

    // Handle literal backslash escapes like \u0012
    if (str.includes("\\u")) {
      try {
        str = JSON.parse(`"${str.replace(/"/g, '\\"')}"`);
      } catch {
        /* ignore invalid escape sequences */
      }
    }

    // Try Base64 decoding if it looks like base64
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
    if (base64Pattern.test(str) && str.length % 4 === 0) {
      try {
        const decoded = atob(str);
        // Convert Latin-1 to proper UTF-8 string
        return new TextDecoder("utf-8").decode(
          Uint8Array.from(decoded, (c) => c.charCodeAt(0))
        );
      } catch {
        // Not valid base64
      }
    }

    return str;
  }

  // Fallback
  return String(bytes);
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
  organizerAccount: string;
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

      // organizer_account is stored as an ID object
      let organizerAccount = "";
      if (fields.organizer_account) {
        if (typeof fields.organizer_account === "string") {
          organizerAccount = fields.organizer_account;
        } else if (
          typeof fields.organizer_account === "object" &&
          fields.organizer_account !== null
        ) {
          // Handle ID object structure: { fields: { inner: "0x..." } }
          const idObj = fields.organizer_account as Record<string, unknown>;
          if (idObj.fields && typeof idObj.fields === "object") {
            const idFields = idObj.fields as Record<string, unknown>;
            if (idFields.inner && typeof idFields.inner === "string") {
              organizerAccount = idFields.inner;
            }
          }
        }
      }

      return {
        active: (fields.active as boolean) ?? false,
        name: decodeSuiString(fields.name),
        description: decodeSuiString(fields.description),
        organizer: (fields.organizer as string) || "",
        organizerAccount,
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
 * Create a transaction to remove an email from event whitelist
 * @param eventId - Event object ID from blockchain
 * @param email - Email address to remove from whitelist
 * @returns Transaction object
 */
export function createRemoveFromWhitelistTransaction(
  eventId: string,
  email: string
): Transaction {
  const tx = new Transaction();
  const emailHashBytes = hashEmailToBytes(email);

  tx.moveCall({
    target: FUNCTION_PATHS.EVENT_REMOVE_FROM_WHITELIST,
    arguments: [
      tx.object(eventId), // &mut Event
      tx.pure.vector("u8", emailHashBytes), // vector<u8> email_hash
    ],
  });

  return tx;
}

/**
 * Create a transaction to close an event
 * @param eventId - Event object ID from blockchain
 * @returns Transaction object
 */
export function createCloseEventTransaction(eventId: string): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: FUNCTION_PATHS.EVENT_CLOSE,
    arguments: [
      tx.object(eventId), // &mut Event
    ],
  });

  return tx;
}

/**
 * Update event active status in Supabase
 * @param eventId - Event ID from blockchain
 * @param active - Active status
 * @returns Success status
 */
export async function updateEventActiveStatus(
  eventId: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("events") as any)
      .update({ active })
      .eq("event_id", eventId);

    if (error) {
      console.error("Error updating event status:", error);
      return {
        success: false,
        error: error.message || "Failed to update event status",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating event status:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update event status",
    };
  }
}

/**
 * Close an event (on-chain and in database)
 * @param eventId - Event object ID from blockchain
 * @param suiClient - SuiClient instance
 * @param signAndExecute - Function to sign and execute transaction
 * @returns Success status and transaction digest
 */
export async function closeEvent(
  eventId: string,
  suiClient: SuiClient,
  signAndExecute: (params: {
    transaction: Transaction;
  }) => Promise<{ digest: string }>
): Promise<{ success: boolean; digest?: string; error?: string }> {
  try {
    // Create and execute transaction
    const tx = createCloseEventTransaction(eventId);
    const result = await signAndExecute({ transaction: tx });

    // Wait for transaction
    await suiClient.waitForTransaction({
      digest: result.digest,
    });

    // Update status in Supabase
    const updateResult = await updateEventActiveStatus(eventId, false);
    if (!updateResult.success) {
      console.error(
        "Failed to update event status in database:",
        updateResult.error
      );
      // Still return success since on-chain update succeeded
    }

    return { success: true, digest: result.digest };
  } catch (error) {
    console.error("Error closing event:", error);
    const parsedError = popchainErrorDecoder.parseError(error);
    return {
      success: false,
      error: parsedError.message,
    };
  }
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
    // Normalize email before hashing to ensure consistent matching
    // Email case may differ, so we normalize to lowercase and trim
    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashEmail(normalizedEmail);
    // Hash is already lowercase hex from sha3_256, but normalize for safety
    const normalizedHash = emailHash.toLowerCase().trim();
    const whitelistingData: WhitelistingInsert = {
      event_id: eventId,
      email: normalizedEmail, // Store normalized email for consistency
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
    const parsedError = popchainErrorDecoder.parseError(error);
    return {
      success: false,
      error: parsedError.message,
    };
  }
}

/**
 * Remove a single email address from event whitelist
 * @param eventId - Event object ID from blockchain
 * @param email - Email address to remove from whitelist
 * @param suiClient - SuiClient instance
 * @param signAndExecute - Function to sign and execute transaction
 * @returns Success status and transaction digest
 */
export async function removeFromWhitelist(
  eventId: string,
  email: string,
  suiClient: SuiClient,
  signAndExecute: (params: {
    transaction: Transaction;
  }) => Promise<{ digest: string }>
): Promise<{ success: boolean; digest?: string; error?: string }> {
  try {
    const tx = createRemoveFromWhitelistTransaction(eventId, email);
    const result = await signAndExecute({ transaction: tx });

    // Wait for transaction
    await suiClient.waitForTransaction({
      digest: result.digest,
    });

    // Delete from Supabase
    // Normalize email before hashing to ensure consistent matching
    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashEmail(normalizedEmail);
    // Hash is already lowercase hex from sha3_256, but normalize for safety
    const normalizedHash = emailHash.toLowerCase().trim();

    const deleteResult = await deleteWhitelisting(eventId, normalizedHash);
    if (!deleteResult.success) {
      console.error(
        "Error deleting whitelisting from database:",
        deleteResult.error
      );
      // Still return success since on-chain removal succeeded
    }

    return { success: true, digest: result.digest };
  } catch (error) {
    console.error("Error removing email from whitelist:", error);
    const parsedError = popchainErrorDecoder.parseError(error);
    return {
      success: false,
      error: parsedError.message,
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
    if (error.code === "PGRST116") {
      // Not found - return null instead of throwing
      return null;
    }
    console.error("Error fetching event:", error);
    throw new Error(`Failed to fetch event: ${error.message}`);
  }

  return data as Event;
}

/**
 * Whitelisting with associated user name from user_profiles (kept for backward compatibility)
 */
export interface WhitelistingWithName extends Whitelisting {
  name?: string; // First name + last name if matched in user_profiles (not used anymore)
}

/**
 * Fetch whitelistings for an event
 * @param eventId - Event ID to fetch whitelistings for
 * @returns Array of whitelistings
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

  return whitelistings as WhitelistingWithName[];
}

/**
 * Delete a whitelisting from Supabase by event ID and email hash
 * @param eventId - Event ID from blockchain
 * @param emailHash - Email hash (normalized lowercase)
 * @returns Success status
 */
export async function deleteWhitelisting(
  eventId: string,
  emailHash: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize hash: lowercase and trim to ensure consistent matching
    const normalizedHash = emailHash.toLowerCase().trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("whitelistings") as any)
      .delete()
      .eq("event_id", eventId)
      .eq("email_hash", normalizedHash);

    if (error) {
      console.error("Error deleting whitelisting:", error);
      return {
        success: false,
        error: error.message || "Failed to delete whitelisting",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting whitelisting:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete whitelisting",
    };
  }
}

/**
 * Check if an email is whitelisted for an event on the blockchain
 * @param eventId - Event object ID from blockchain
 * @param emailHash - Email hash (hex string, normalized lowercase)
 * @param suiClient - SuiClient instance
 * @returns true if whitelisted, false otherwise
 */
export async function isEmailWhitelisted(
  eventId: string,
  emailHash: string,
  suiClient: SuiClient
): Promise<boolean> {
  try {
    // Normalize hash: lowercase and trim to ensure consistent matching
    const normalizedHash = emailHash.toLowerCase().trim();

    // Convert hex string to bytes array for the table key
    // Email hash is stored as hex string, need to convert to bytes
    const hashBytes = Uint8Array.from(
      normalizedHash.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    // Get the event object to access the whitelist table
    const eventObject = await suiClient.getObject({
      id: eventId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (
      !eventObject.data ||
      eventObject.error ||
      !("content" in eventObject.data)
    ) {
      console.error("Event not found:", eventId);
      return false;
    }

    const content = eventObject.data.content;
    if (!content || !("fields" in content)) {
      return false;
    }

    const fields = content.fields as Record<string, unknown>;

    // Get the whitelist table ID
    let whitelistTableId: string | null = null;
    if (fields.whitelist) {
      if (typeof fields.whitelist === "string") {
        whitelistTableId = fields.whitelist;
      } else if (
        typeof fields.whitelist === "object" &&
        fields.whitelist !== null &&
        "fields" in fields.whitelist
      ) {
        const whitelistObj = fields.whitelist as Record<string, unknown>;
        if (whitelistObj.id) {
          if (typeof whitelistObj.id === "string") {
            whitelistTableId = whitelistObj.id;
          } else if (
            typeof whitelistObj.id === "object" &&
            whitelistObj.id !== null &&
            "id" in whitelistObj.id
          ) {
            const idObj = whitelistObj.id as Record<string, unknown>;
            if (typeof idObj.id === "string") {
              whitelistTableId = idObj.id;
            }
          }
        }
      }
    }

    if (!whitelistTableId) {
      console.error("Could not find whitelist table ID in event object");
      return false;
    }

    // Try to get the dynamic field object for this email hash
    // In Sui, table entries are stored as dynamic fields
    // The key is the email hash bytes
    try {
      const dynamicField = await suiClient.getDynamicFieldObject({
        parentId: whitelistTableId,
        name: {
          type: "vector<u8>",
          value: Array.from(hashBytes),
        },
      });

      // If the dynamic field exists, the email is whitelisted
      return !!dynamicField.data && !dynamicField.error;
    } catch {
      // If getDynamicFieldObject throws or returns error, the key doesn't exist
      return false;
    }
  } catch (error) {
    console.error("Error checking whitelisting on blockchain:", error);
    return false;
  }
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
