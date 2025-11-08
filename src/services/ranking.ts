import type { SuiClient } from "@mysten/sui/client";
import supabase from "@/utils/supabase";
import {
  getCertificatesForAccount,
  getCertificateFromBlockchain,
} from "@/services/certificates";

export interface AccountRanking {
  accountAddress: string;
  popPass: number;
  popBadge: number;
  popMedal: number;
  popTrophy: number;
  total: number;
}

/**
 * Get ranking of PopChain accounts by certificate count
 * @param suiClient - SuiClient instance
 * @param limit - Number of top accounts to return (default: 10)
 * @returns Array of account rankings sorted by total certificates
 */
export async function getAccountRankings(
  suiClient: SuiClient,
  limit: number = 10
): Promise<AccountRanking[]> {
  try {
    // Get all PopChainAccount addresses from database
    const { data: profiles, error } = await supabase
      .from("user_profiles")
      .select("popchain_account_address, wallet_address")
      .not("popchain_account_address", "is", null)
      .eq("role", 0);
    if (error) {
      console.error("Error fetching profiles:", error);
      return [];
    }

    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Type assertion for profiles - Supabase returns unknown structure
    type ProfileRow = {
      popchain_account_address: string | null;
      wallet_address: string | null;
    };
    const typedProfiles = (profiles || []) as ProfileRow[];

    // Get certificate counts for each account
    const accountRankings = await Promise.all(
      typedProfiles.map(async (profile) => {
        if (!profile.popchain_account_address) {
          return null;
        }

        try {
          // Get all certificate IDs for this account
          const certificateIds = await getCertificatesForAccount(
            profile.popchain_account_address,
            profile.wallet_address || null,
            suiClient
          );

          // Get certificate details to count by tier
          const certificateDetails = await Promise.all(
            certificateIds.map(async (id) => {
              const cert = await getCertificateFromBlockchain(id, suiClient);
              return cert;
            })
          );

          // Count certificates by tier
          const counts = {
            popPass: 0,
            popBadge: 0,
            popMedal: 0,
            popTrophy: 0,
          };

          certificateDetails.forEach((cert) => {
            if (cert) {
              const tierName = cert.tier.name.toLowerCase();
              if (tierName === "poppass") {
                counts.popPass++;
              } else if (tierName === "popbadge") {
                counts.popBadge++;
              } else if (tierName === "popmedal") {
                counts.popMedal++;
              } else if (tierName === "poptrophy") {
                counts.popTrophy++;
              }
            }
          });

          const total =
            counts.popPass +
            counts.popBadge +
            counts.popMedal +
            counts.popTrophy;

          return {
            accountAddress: profile.popchain_account_address,
            popPass: counts.popPass,
            popBadge: counts.popBadge,
            popMedal: counts.popMedal,
            popTrophy: counts.popTrophy,
            total,
          };
        } catch (error) {
          console.error(
            `Error fetching certificates for account ${profile.popchain_account_address}:`,
            error
          );
          return null;
        }
      })
    );

    // Filter out nulls and sort by total (descending)
    const validRankings: AccountRanking[] = accountRankings.filter(
      (ranking): ranking is AccountRanking =>
        ranking !== null && ranking.total > 0
    );

    validRankings.sort((a, b) => b.total - a.total);

    // Return top N accounts
    return validRankings.slice(0, limit);
  } catch (error) {
    console.error("Error getting account rankings:", error);
    return [];
  }
}
