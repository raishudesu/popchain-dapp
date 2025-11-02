import type { SuiClient } from "@mysten/sui/client";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import { FUNCTION_PATHS } from "@/lib/constants";

/**
 * Get the balance of a wallet address in SUI
 * @param address - Wallet address
 * @param suiClient - SuiClient instance
 * @returns Balance in MIST and SUI
 */
export async function getWalletBalance(
  address: string,
  suiClient: SuiClient
): Promise<{ mist: string; sui: string }> {
  const balance = await suiClient.getBalance({
    owner: address,
    coinType: SUI_TYPE_ARG,
  });

  const mistBigInt = BigInt(balance.totalBalance);
  const suiValue = Number(mistBigInt) / 1_000_000_000;

  return {
    mist: balance.totalBalance,
    sui: suiValue.toString(),
  };
}

/**
 * Get PopChain account balance from on-chain object
 * @param accountAddress - PopChainAccount object ID
 * @param suiClient - SuiClient instance
 * @returns Balance in MIST and SUI, or null if account not found
 */
export async function getPopChainAccountBalance(
  accountAddress: string,
  suiClient: SuiClient
): Promise<{ mist: string; sui: string } | null> {
  try {
    const object = await suiClient.getObject({
      id: accountAddress,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!object.data || object.error) {
      return null;
    }

    // PopChainAccount has a balance field (Coin<SUI>)
    // Structure: fields.balance.fields.balance contains the u64 balance as string
    // Balance comes back as u64 (often string). Format reliably using bigint math.
    const content = object.data.content;
    if (content && "fields" in content) {
      const fields = content.fields as Record<string, unknown>;
      const balanceCoin = fields.balance;

      // Handle balance - can be directly a string/number, or nested Coin object
      let mistStr: string | undefined;

      if (typeof balanceCoin === "string") {
        mistStr = balanceCoin;
      } else if (typeof balanceCoin === "number") {
        mistStr = String(balanceCoin);
      } else if (balanceCoin && typeof balanceCoin === "object") {
        // Coin structure: { type: "...", fields: { balance: "200000000", id: {...} } }
        const coinObj = balanceCoin as Record<string, unknown>;
        if (coinObj.fields && typeof coinObj.fields === "object") {
          const coinFields = coinObj.fields as Record<string, unknown>;
          const rawBalance = coinFields.balance;

          if (typeof rawBalance === "string") {
            mistStr = rawBalance;
          } else if (typeof rawBalance === "number") {
            mistStr = String(rawBalance);
          }
        }
      }

      if (mistStr) {
        const mistBigInt = BigInt(mistStr);
        const suiValue = Number(mistBigInt) / 1_000_000_000;

        return {
          mist: mistStr,
          sui: suiValue.toString(),
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching PopChain account balance:", error);
    return null;
  }
}

/**
 * Create a transaction that deposits funds by splitting from the gas coin
 * This is the recommended approach - split from gas coin for deposit,
 * remaining gas coin is automatically used for gas fees
 * Reference: Based on Sui SDK best practices
 * @param accountId - PopChainAccount object ID
 * @param amountInMist - Amount to deposit in MIST
 * @returns Transaction object
 */
export function createDepositTransaction(
  accountId: string,
  amountInMist: string
): Transaction {
  const tx = new Transaction();

  // Split from gas coin - the remaining gas coin will be used automatically for gas fees
  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);

  // Deposit the split coin
  tx.moveCall({
    target: FUNCTION_PATHS.WALLET_DEPOSIT,
    arguments: [
      tx.object(accountId), // &mut PopChainAccount
      paymentCoin, // Coin<SUI> from split
    ],
  });

  return tx;
}
