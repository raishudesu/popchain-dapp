import type { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import {
  FUNCTION_PATHS,
  PLATFORM_TREASURY_ADDRESS,
  CONTRACT_PACKAGE_ID,
} from "@/lib/constants";

/**
 * Get PlatformTreasury balance from blockchain
 * @param suiClient - SuiClient instance
 * @returns Balance in MIST and SUI, or null if not found
 */
export async function getTreasuryBalance(
  suiClient: SuiClient
): Promise<{ mist: string; sui: string } | null> {
  try {
    const object = await suiClient.getObject({
      id: PLATFORM_TREASURY_ADDRESS,
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

      // balance is a Coin<SUI> object
      // Structure: fields.balance = { type: "0x2::coin::Coin<...>", fields: { balance: "9000", id: {...} } }
      let balanceValue = "0";
      if (fields.balance) {
        if (
          typeof fields.balance === "object" &&
          fields.balance !== null &&
          "fields" in fields.balance
        ) {
          // Coin object has fields.balance with the balance as a string
          const balanceObj = fields.balance as Record<string, unknown>;
          const balanceFields = balanceObj.fields as Record<string, unknown>;
          if (
            balanceFields.balance &&
            typeof balanceFields.balance === "string"
          ) {
            balanceValue = balanceFields.balance;
          }
        } else if (typeof fields.balance === "string") {
          // Fallback: if balance is directly a string (unlikely but handle it)
          balanceValue = fields.balance;
        }
      }

      const mistBigInt = BigInt(balanceValue);
      const suiValue = Number(mistBigInt) / 1_000_000_000;

      return {
        mist: balanceValue,
        sui: suiValue.toString(),
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching treasury balance:", error);
    return null;
  }
}

/**
 * Get PlatformTreasury owner address from blockchain
 * @param suiClient - SuiClient instance
 * @returns Owner address or null if not found
 */
export async function getTreasuryOwner(
  suiClient: SuiClient
): Promise<string | null> {
  try {
    const object = await suiClient.getObject({
      id: PLATFORM_TREASURY_ADDRESS,
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

      if (fields.owner && typeof fields.owner === "string") {
        return fields.owner;
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching treasury owner:", error);
    return null;
  }
}

/**
 * Create a transaction to withdraw funds from PlatformTreasury to owner
 * @param amount - Amount to withdraw in MIST (1 SUI = 1_000_000_000 MIST)
 * @returns Transaction object
 */
export function createWithdrawTransaction(amount: string): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: FUNCTION_PATHS.ADMIN_WITHDRAW_TO_OWNER,
    arguments: [
      tx.object(PLATFORM_TREASURY_ADDRESS), // &mut PlatformTreasury
      tx.pure.u64(amount), // amount: u64
    ],
  });

  return tx;
}

/**
 * Get recent transactions for the PopChain package
 * @param suiClient - SuiClient instance
 * @param limit - Maximum number of transactions to return (default: 20)
 * @returns Array of transaction digests with timestamps
 */
export async function getRecentTreasuryEvents(
  suiClient: SuiClient,
  limit: number = 20
): Promise<
  Array<{
    type: string;
    timestamp: number | null;
    digest: string;
    data: {
      amount?: string;
      new_balance?: string;
      remaining_balance?: string;
      owner?: string;
      base_fee?: number;
      event_creation_fee?: number;
      mint_fee?: number;
    };
  }>
> {
  try {
    // Query all events from all modules in the package
    // We need to query each module separately, or query by package using a different approach
    const modules = [
      "popchain_admin",
      "popchain_wallet",
      "popchain_user",
      "popchain_event",
      "popchain_certificate",
    ];

    const allEvents: Array<{
      type: string;
      timestamp: number | null;
      digest: string;
      data: Record<string, unknown>;
    }> = [];

    // Query events from each module
    for (const module of modules) {
      try {
        const events = await suiClient.queryEvents({
          query: {
            MoveModule: {
              package: CONTRACT_PACKAGE_ID,
              module,
            },
          },
          limit: limit * 2, // Get more events to filter from
          order: "descending",
        });

        for (const event of events.data) {
          allEvents.push({
            type: event.type,
            timestamp: event.timestampMs ? parseInt(event.timestampMs) : null,
            digest: event.id.txDigest,
            data: (event.parsedJson as Record<string, unknown>) || {},
          });
        }
      } catch (error) {
        console.error(`Error querying events from module ${module}:`, error);
      }
    }

    // Get unique transaction digests from events
    const transactionDigests = new Set<string>();
    const eventMap = new Map<
      string,
      Array<{
        type: string;
        timestamp: number | null;
        data: Record<string, unknown>;
      }>
    >();

    for (const event of allEvents) {
      const digest = event.digest;
      transactionDigests.add(digest);

      if (!eventMap.has(digest)) {
        eventMap.set(digest, []);
      }

      eventMap.get(digest)!.push({
        type: event.type,
        timestamp: event.timestamp,
        data: event.data,
      });
    }

    // Query transaction details for each unique digest
    const transactions = await Promise.all(
      Array.from(transactionDigests)
        .slice(0, limit)
        .map(async (digest) => {
          try {
            const tx = await suiClient.getTransactionBlock({
              digest,
              options: {
                showEffects: true,
                showEvents: true,
                showInput: true,
              },
            });

            // Get the most recent event timestamp for this transaction
            const eventsForTx = eventMap.get(digest) || [];
            const latestEvent = eventsForTx.sort((a, b) => {
              const timeA = a.timestamp || 0;
              const timeB = b.timestamp || 0;
              return timeB - timeA;
            })[0];

            // Try to extract event data from the most relevant event
            let eventData: Record<string, unknown> = {};
            if (eventsForTx.length > 0) {
              // Prefer treasury-related events
              const treasuryEvent = eventsForTx.find((e) =>
                e.type.includes("popchain_admin")
              );
              if (treasuryEvent) {
                eventData = treasuryEvent.data;
              } else {
                eventData = latestEvent.data;
              }
            }

            return {
              type: latestEvent?.type || "Transaction",
              timestamp:
                latestEvent?.timestamp ||
                (tx.timestampMs ? parseInt(tx.timestampMs) : null),
              digest,
              data: {
                amount: eventData.amount ? String(eventData.amount) : undefined,
                new_balance: eventData.new_balance
                  ? String(eventData.new_balance)
                  : undefined,
                remaining_balance: eventData.remaining_balance
                  ? String(eventData.remaining_balance)
                  : undefined,
                owner: eventData.owner ? String(eventData.owner) : undefined,
                base_fee: eventData.base_fee
                  ? Number(eventData.base_fee)
                  : undefined,
                event_creation_fee: eventData.event_creation_fee
                  ? Number(eventData.event_creation_fee)
                  : undefined,
                mint_fee: eventData.mint_fee
                  ? Number(eventData.mint_fee)
                  : undefined,
              },
            };
          } catch (error) {
            console.error(`Error fetching transaction ${digest}:`, error);
            // Fallback to event data only
            const eventsForTx = eventMap.get(digest) || [];
            const latestEvent = eventsForTx[0];
            return {
              type: latestEvent?.type || "Transaction",
              timestamp: latestEvent?.timestamp || null,
              digest,
              data: {},
            };
          }
        })
    );

    // Sort by timestamp (most recent first)
    transactions.sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      return timeB - timeA;
    });

    return transactions;
  } catch (error) {
    console.error("Error fetching package transactions:", error);
    return [];
  }
}
