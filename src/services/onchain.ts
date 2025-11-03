import { Transaction } from "@mysten/sui/transactions";
import { hashEmailToBytes } from "@/utils/hash";
import { FUNCTION_PATHS } from "@/lib/constants";

/**
 * Map user type to smart contract role enum
 * 0 = Attendee, 1 = Organizer, 2 = Both
 */
export function getUserRole(userType: "organizer" | "attendee"): number {
  return userType === "organizer" ? 1 : 0;
}

/**
 * Create a transaction for creating a PopChain account on-chain
 *
 * @param email - User's email address
 * @param userType - User type (organizer or attendee)
 * @param ownerAddress - Wallet address of the account owner
 * @returns Transaction object ready to be signed and executed
 */
export function createAccountTransaction(
  email: string,
  userType: "organizer" | "attendee",
  ownerAddress: string
): Transaction {
  const tx = new Transaction();

  // Hash email to bytes (vector<u8>)
  const emailHash = hashEmailToBytes(email);

  // Map user type to role number
  const userRole = getUserRole(userType);

  // Call the create_account entry function
  // For vector<u8>, convert Uint8Array to Array<number> and use pure.vector
  const emailHashArray = Array.from(emailHash);

  tx.moveCall({
    target: FUNCTION_PATHS.USER_CREATE_ACCOUNT,
    arguments: [
      tx.pure.vector("u8", emailHashArray), // vector<u8>
      tx.pure.u8(userRole), // u8
      tx.pure.address(ownerAddress), // address
    ],
  });

  return tx;
}

/**
 * Extract the PopChainAccount object ID from transaction result
 * Handles both dapp-kit and SDK transaction result formats
 *
 * @param txResult - Transaction result from signAndExecuteTransaction or dapp-kit signAndExecute
 * @returns The object ID of the created PopChainAccount, or null if not found
 */
export function extractAccountId(txResult: unknown): string | null {
  if (!txResult || typeof txResult !== "object") {
    console.warn("extractAccountId: Invalid transaction result", txResult);
    return null;
  }

  const result = txResult as Record<string, unknown>;

  // Log the structure for debugging
  console.log("Transaction result structure:", {
    keys: Object.keys(result),
    hasObjectChanges: "objectChanges" in result,
    hasEffects: "effects" in result,
    hasTransaction: "transaction" in result,
  });

  // Method 1: Check objectChanges directly (SDK format)
  if (result.objectChanges && Array.isArray(result.objectChanges)) {
    const objectChanges = result.objectChanges as Array<{
      type?: string;
      objectId?: string;
      objectType?: string;
    }>;

    console.log("Found objectChanges:", objectChanges);

    // Look for created objects with PopChainAccount type
    const createdAccount = objectChanges.find(
      (change) =>
        change.type === "created" &&
        change.objectId &&
        change.objectType?.includes("PopChainAccount")
    );

    if (createdAccount?.objectId) {
      console.log(
        "Found account ID from objectChanges (PopChainAccount):",
        createdAccount.objectId
      );
      return createdAccount.objectId;
    }

    // Fallback: just get the first created object
    const firstCreated = objectChanges.find(
      (change) => change.type === "created" && change.objectId
    );

    if (firstCreated?.objectId) {
      console.log(
        "Found account ID from objectChanges (first created):",
        firstCreated.objectId
      );
      return firstCreated.objectId;
    }
  }

  // Method 2: Check effects.created (SDK format)
  if (result.effects && typeof result.effects === "object") {
    const effectsObj = result.effects as Record<string, unknown>;

    // Check for created objects array
    if ("created" in effectsObj && Array.isArray(effectsObj.created)) {
      const created = effectsObj.created as Array<{
        reference?: { objectId?: string };
        owner?: unknown;
        objectId?: string;
      }>;

      console.log("Found effects.created:", created);

      // Handle different structures
      for (const item of created) {
        // Try direct objectId
        if (item.objectId) {
          console.log(
            "Found account ID from effects.created (direct):",
            item.objectId
          );
          return item.objectId;
        }
        // Try reference.objectId
        if (item.reference?.objectId) {
          console.log(
            "Found account ID from effects.created (reference):",
            item.reference.objectId
          );
          return item.reference.objectId;
        }
      }
    }
  }

  // Method 3: Check if dapp-kit wrapped the result (dapp-kit might return result.transaction)
  if (result.transaction && typeof result.transaction === "object") {
    const transactionResult = result.transaction as Record<string, unknown>;
    const nestedId = extractAccountId(transactionResult);
    if (nestedId) {
      return nestedId;
    }
  }

  // Method 4: Check for digest and query transaction (last resort)
  if (result.digest && typeof result.digest === "string") {
    console.warn(
      "Could not extract account ID from transaction result. Transaction digest:",
      result.digest
    );
    console.warn("Full transaction result:", JSON.stringify(result, null, 2));
  }

  return null;
}

/**
 * Create a transaction to link a wallet address to a PopChainAccount
 * @param accountId - PopChainAccount object ID
 * @param walletAddress - Wallet address to link
 * @returns Transaction object
 */
export function createLinkWalletTransaction(
  accountId: string,
  walletAddress: string
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: FUNCTION_PATHS.USER_LINK_WALLET,
    arguments: [
      tx.object(accountId), // &mut PopChainAccount
      tx.pure.address(walletAddress), // address
    ],
  });

  return tx;
}
