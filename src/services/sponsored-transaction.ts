import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { hashEmailToBytes } from "@/utils/hash";
import { FUNCTION_PATHS } from "@/lib/constants";
import { extractAccountId } from "./onchain";
import { networkConfig } from "@/configs/network-config";

/**
 * Map user type to smart contract role enum
 * 0 = Attendee, 1 = Organizer, 2 = Both
 */
function getUserRole(userType: "organizer" | "attendee"): number {
  return userType === "organizer" ? 1 : 0;
}

/**
 * Get or create the service wallet keypair for sponsored transactions
 * Uses environment variable VITE_SERVICE_WALLET_PRIVATE_KEY
 * Optionally uses VITE_SERVICE_WALLET_PASSPHRASE if key is encrypted/passphrase-protected
 * Supports multiple formats: base64, hex, or raw secret key bytes
 *
 * Note: If your key is from Sui Slush wallet and requires a passphrase,
 * you may need to export it differently or use the recovery phrase instead
 *
 * @returns Keypair or null if not configured
 */
export function getServiceWallet(): Ed25519Keypair | null {
  const privateKeyEnv = import.meta.env.VITE_SERVICE_WALLET_PRIVATE_KEY;
  const passphraseEnv = import.meta.env.VITE_SERVICE_WALLET_PASSPHRASE;

  if (!privateKeyEnv) {
    console.warn(
      "Service wallet not configured. Set VITE_SERVICE_WALLET_PRIVATE_KEY in .env file"
    );
    console.warn(
      "Note: After adding .env variables, restart your dev server (npm run dev)"
    );
    return null;
  }

  // Note: Sui Slush wallet exports typically require you to enter the passphrase
  // during export, and then give you the decrypted private key.
  // The VITE_SERVICE_WALLET_PASSPHRASE is for future use if needed.
  if (passphraseEnv) {
    console.log(
      "Note: Passphrase is set, but Sui wallet exports are usually already decrypted."
    );
  }

  try {
    const cleaned = privateKeyEnv.trim();
    const expectedAddress =
      "0xcf82ff81af8d44d91e309262263d54b1349e1fd838490e02bfa7a8df70581c17";

    // Check if it's Bech32 format (suiprivkey1...) - from Sui Slush wallet
    if (cleaned.startsWith("suiprivkey1")) {
      try {
        // Ed25519Keypair.fromSecretKey() handles Bech32 strings directly!
        // It automatically decodes the Bech32 format
        const keypair = Ed25519Keypair.fromSecretKey(cleaned);
        const address = keypair.toSuiAddress();

        console.log("Private key loaded from Bech32 format:", {
          format: "bech32",
          address,
          matches: address === expectedAddress ? "✓ MATCH!" : "✗ no match",
        });

        if (address === expectedAddress) {
          console.log(
            "✓ Successfully loaded service wallet from Bech32 format!"
          );
          return keypair;
        } else {
          console.warn(
            `⚠️ Address mismatch!\n` +
              `Expected: ${expectedAddress}\n` +
              `Got:      ${address}\n` +
              `Please verify your VITE_SERVICE_WALLET_PRIVATE_KEY is correct.`
          );
          // Still return it - might be a different key
          return keypair;
        }
      } catch (bech32Error) {
        console.error(
          "Failed to decode Bech32 private key. Please check the format.",
          bech32Error
        );
        return null;
      }
    }

    // Handle other formats (base64, hex)
    let privateKeyBytes: Uint8Array;
    let decodedFormat: string = "";

    // Try to parse as base64 first
    try {
      privateKeyBytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
      decodedFormat = "base64";
    } catch (base64Error) {
      // If base64 fails, try hex format
      try {
        const hexCleaned = cleaned.replace(/^0x/, "");
        privateKeyBytes = new Uint8Array(
          hexCleaned
            .match(/.{1,2}/g)
            ?.map((byte: string) => parseInt(byte, 16)) || []
        );
        decodedFormat = "hex";
      } catch (hexError) {
        console.error(
          "Failed to parse service wallet private key. Expected Bech32 (suiprivkey1...), base64, or hex format.",
          { base64Error, hexError }
        );
        return null;
      }
    }

    // Debug: Log what we decoded
    console.log("Private key decoded:", {
      format: decodedFormat,
      length: privateKeyBytes.length,
      firstBytes: Array.from(privateKeyBytes.slice(0, 8))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    });

    // Ed25519 keypair can accept different secret key formats
    // Try different extraction methods and verify against expected address
    // Common formats:
    // - 32 bytes: private key only
    // - 64 bytes: private key (32) + public key (32)
    // - Other lengths: might have metadata, prefixes, or different encoding

    const extractionMethods: Array<{
      name: string;
      extract: () => Uint8Array | null;
    }> = [
      // Try full key as-is (64 bytes or other)
      { name: "full key", extract: () => privateKeyBytes },
      // Try first 32 bytes
      {
        name: "first 32 bytes",
        extract: () =>
          privateKeyBytes.length >= 32 ? privateKeyBytes.slice(0, 32) : null,
      },
      // Try last 32 bytes (might have prefix)
      {
        name: "last 32 bytes",
        extract: () =>
          privateKeyBytes.length >= 32 ? privateKeyBytes.slice(-32) : null,
      },
      // Try bytes 1-32 (skip first byte, might be format flag)
      {
        name: "bytes 1-32",
        extract: () =>
          privateKeyBytes.length >= 33 ? privateKeyBytes.slice(1, 33) : null,
      },
      // Try last 64 bytes if longer
      {
        name: "last 64 bytes",
        extract: () =>
          privateKeyBytes.length >= 64 ? privateKeyBytes.slice(-64) : null,
      },
    ];

    for (const method of extractionMethods) {
      try {
        const keyBytes = method.extract();
        if (!keyBytes || keyBytes.length < 32) continue;

        const keypair = Ed25519Keypair.fromSecretKey(keyBytes);
        const address = keypair.toSuiAddress();

        console.log(`Tried "${method.name}" (${keyBytes.length} bytes):`, {
          address,
          matches: address === expectedAddress ? "✓ MATCH!" : "✗ no match",
        });

        if (address === expectedAddress) {
          console.log(
            `✓ Successfully loaded service wallet with method: "${method.name}"`
          );
          return keypair;
        }
      } catch {
        // Try next method
        // Silently continue - error is expected for invalid formats
      }
    }

    // If we get here, none matched - use the most likely format and warn
    console.warn(
      `⚠️ Could not find key extraction method that matches expected address.\n` +
        `Expected: ${expectedAddress}\n` +
        `Trying default method (last 32 bytes)...`
    );

    try {
      const defaultKey =
        privateKeyBytes.length >= 32
          ? privateKeyBytes.slice(-32)
          : privateKeyBytes;
      const keypair = Ed25519Keypair.fromSecretKey(defaultKey);
      const actualAddress = keypair.toSuiAddress();

      console.warn(
        `Loaded keypair but address doesn't match!\n` +
          `Expected: ${expectedAddress}\n` +
          `Got:      ${actualAddress}\n\n` +
          `This suggests:\n` +
          `1. The private key format from Sui Slush wallet might need special parsing\n` +
          `2. Or the key in VITE_SERVICE_WALLET_PRIVATE_KEY might not match the expected address\n\n` +
          `Please verify:\n` +
          `- Export the private key from Sui Slush wallet again\n` +
          `- Ensure it's in base64 or hex format\n` +
          `- Check if Slush uses a different key derivation path or format`
      );

      // Return it anyway but with warning
      return keypair;
    } catch (error) {
      console.error(
        `Failed to create keypair from private key.\n` +
          `Key length: ${privateKeyBytes.length} bytes\n` +
          `Expected address: ${expectedAddress}\n` +
          `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  } catch (error) {
    console.error("Failed to load service wallet:", error);
    console.error(
      "Please check that VITE_SERVICE_WALLET_PRIVATE_KEY is correctly formatted (base64 or hex)"
    );
    return null;
  }
}

/**
 * Get SuiClient for the current network
 * Uses the same network config as the app
 */
export function getSuiClient(): SuiClient {
  // Get network from environment or default to testnet (matching main.tsx defaultNetwork)
  const network =
    (import.meta.env.VITE_SUI_NETWORK as "testnet" | "mainnet" | "devnet") ||
    "testnet";

  // Use custom URL if provided, otherwise use networkConfig
  const customUrl = import.meta.env.VITE_SUI_NETWORK_URL;
  if (customUrl) {
    return new SuiClient({ url: customUrl });
  }

  // Get URL from networkConfig
  const networkConfigEntry = networkConfig[network];
  if (networkConfigEntry && networkConfigEntry.url) {
    return new SuiClient({ url: networkConfigEntry.url });
  }

  // Fallback to testnet if network not found in config
  return new SuiClient({ url: networkConfig.testnet.url });
}

/**
 * Check if service wallet has sufficient SUI balance
 */
async function checkServiceWalletBalance(): Promise<{
  hasBalance: boolean;
  balance?: string;
  address?: string;
  error?: string;
}> {
  try {
    const serviceWallet = getServiceWallet();
    if (!serviceWallet) {
      return { hasBalance: false, error: "Service wallet not configured" };
    }

    const suiClient = getSuiClient();
    const address = serviceWallet.toSuiAddress();

    // Get all coins owned by the service wallet
    const coins = await suiClient.getCoins({ owner: address });

    if (!coins.data || coins.data.length === 0) {
      return {
        hasBalance: false,
        balance: "0",
        address,
        error: "No SUI coins found in service wallet",
      };
    }

    // Calculate total balance
    let totalBalance = BigInt(0);
    for (const coin of coins.data) {
      totalBalance += BigInt(coin.balance || "0");
    }

    // Convert from MIST to SUI (1 SUI = 10^9 MIST)
    const balanceInSui = Number(totalBalance) / 1_000_000_000;

    return {
      hasBalance: balanceInSui > 0,
      balance: balanceInSui.toFixed(4),
      address,
    };
  } catch (error) {
    return {
      hasBalance: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a sponsored transaction using the service wallet
 * The service wallet (admin) will pay for gas fees
 *
 * @param email - User's email address
 * @param userType - User type (organizer or attendee)
 * @param ownerAddress - Wallet address (for attendees without wallet, uses admin address)
 * @returns Transaction result with account ID or error
 */
export async function requestSponsoredAccountCreation(
  email: string,
  userType: "organizer" | "attendee",
  ownerAddress: string | null
): Promise<{
  success: boolean;
  accountId?: string;
  error?: string;
}> {
  try {
    // Get service wallet
    const serviceWallet = getServiceWallet();
    if (!serviceWallet) {
      return {
        success: false,
        error:
          "Service wallet not configured. Please contact support or connect your wallet.",
      };
    }

    const walletAddress = serviceWallet.toSuiAddress();

    // Log wallet address for debugging (can be removed in production)
    console.log("Service wallet address:", walletAddress);
    console.log(
      "If this address is unexpected, check your VITE_SERVICE_WALLET_PRIVATE_KEY in .env"
    );

    // Check balance before attempting transaction
    const balanceCheck = await checkServiceWalletBalance();
    if (!balanceCheck.hasBalance) {
      return {
        success: false,
        error:
          `Service wallet has insufficient SUI for gas fees.\n\n` +
          `Wallet address: ${walletAddress}\n` +
          `Current balance: ${balanceCheck.balance || "0"} SUI\n\n` +
          `Please fund this wallet with SUI tokens.\n\n` +
          `For testnet/devnet, use a faucet:\n` +
          `- Testnet: https://docs.sui.io/testnet/faucet\n` +
          `- Devnet: https://docs.sui.io/devnet/faucet\n\n` +
          `Or transfer SUI using:\n` +
          `sui client transfer --to ${walletAddress} --amount <amount_in_sui> --gas-budget 1000`,
      };
    }

    // Get Sui client
    const suiClient = getSuiClient();

    // Create transaction
    const tx = new Transaction();

    // Hash email to bytes
    const emailHash = hashEmailToBytes(email);
    const emailHashArray = Array.from(emailHash);

    // Map user type to role
    const userRole = getUserRole(userType);

    // For attendees without wallet, use 0x0 as default sentinel address
    // They can update/transfer ownership later when they connect their wallet
    const finalOwnerAddress = ownerAddress || "0x0";

    // Build the transaction
    tx.moveCall({
      target: FUNCTION_PATHS.USER_CREATE_ACCOUNT,
      arguments: [
        tx.pure.vector("u8", emailHashArray), // vector<u8>
        tx.pure.u8(userRole), // u8
        tx.pure.address(finalOwnerAddress), // address
      ],
    });

    // Sign and execute using service wallet
    const result = await suiClient.signAndExecuteTransaction({
      signer: serviceWallet,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    // Extract account ID
    const accountId = extractAccountId(result);

    if (!accountId) {
      return {
        success: false,
        error: "Failed to extract account ID from transaction",
      };
    }

    return {
      success: true,
      accountId,
    };
  } catch (error) {
    console.error("Sponsored transaction error:", error);

    // Check for gas-related errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("gas") ||
      errorMessage.includes("No valid gas coins") ||
      errorMessage.includes("insufficient")
    ) {
      const balanceCheck = await checkServiceWalletBalance();

      return {
        success: false,
        error:
          `Service wallet has insufficient SUI for gas fees.\n\n` +
          `Wallet address: ${balanceCheck.address || "unknown"}\n` +
          `Current balance: ${balanceCheck.balance || "0"} SUI\n\n` +
          `Please fund this wallet with SUI tokens.\n\n` +
          `For testnet/devnet, use a faucet:\n` +
          `- Testnet: https://docs.sui.io/testnet/faucet\n` +
          `- Devnet: https://docs.sui.io/devnet/faucet\n\n` +
          `Or transfer SUI using:\n` +
          `sui client transfer --to ${balanceCheck.address} --amount <amount_in_sui> --gas-budget 1000`,
      };
    }

    return {
      success: false,
      error:
        errorMessage ||
        "An unexpected error occurred during sponsored transaction",
    };
  }
}
