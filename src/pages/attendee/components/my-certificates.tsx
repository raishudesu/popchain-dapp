import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useSuiClient,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useAuth } from "@/contexts/auth-context";
import {
  getCertificatesForAccount,
  getCertificateFromBlockchain,
} from "@/services/certificates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Wallet, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  getTierByName,
  getTierImageUrl,
  type TierName,
} from "@/lib/certificate-tiers";
import { linkWalletToAccount } from "@/services/wallet";
import { transferCertificateToWallet } from "@/services/certificate-minting";
import { parseError } from "@/utils/errors";
import supabase from "@/utils/supabase";

export function MyCertificates() {
  const { profile, loading: authLoading } = useAuth();
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const [linkingWallet, setLinkingWallet] = useState(false);
  const [transferringCertId, setTransferringCertId] = useState<string | null>(
    null
  );

  // Fetch certificates from blockchain
  const {
    data: certificates,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "my-certificates",
      profile?.popchain_account_address,
      profile?.wallet_address,
    ],
    queryFn: async () => {
      if (!profile?.popchain_account_address) {
        return [];
      }

      // Get certificate IDs from blockchain
      const certificateIds = await getCertificatesForAccount(
        profile.popchain_account_address,
        profile.wallet_address || null,
        suiClient
      );

      // Fetch details for each certificate
      const certificateDetails = await Promise.all(
        certificateIds.map(async (id) => {
          const cert = await getCertificateFromBlockchain(id, suiClient);
          if (!cert) return null;

          // Get certificate image URL from blockchain (stored in certificateUrlHash field)
          const imageUrl = cert.certificateUrlHash || null;

          // Get tier image URL - use the one from blockchain first, fallback to our tier definitions
          let tierImageUrl = cert.tier.imageUrl || null;
          if (!tierImageUrl) {
            const tier = getTierByName(cert.tier.name as TierName);
            if (tier) {
              tierImageUrl = getTierImageUrl(tier);
            }
          }

          return {
            ...cert,
            id,
            imageUrl,
            tierImageUrl,
          };
        })
      );

      return certificateDetails.filter(
        (cert): cert is NonNullable<typeof cert> => cert !== null
      );
    },
    enabled: !authLoading && !!profile?.popchain_account_address,
  });

  const handleLinkWallet = async () => {
    if (!account || !profile?.popchain_account_address) {
      toast.error(
        "Please connect your wallet and ensure you have a PopChain account"
      );
      return;
    }

    setLinkingWallet(true);
    try {
      const walletAddress = account.address;
      const result = await linkWalletToAccount(
        profile.popchain_account_address,
        walletAddress,
        suiClient,
        signAndExecute
      );

      if (result.success) {
        // Update wallet address in database
        // Type assertion needed due to Supabase TypeScript type inference issue
        const { error: updateError } = await supabase
          .from("user_profiles")
          // @ts-expect-error - Supabase type inference issue with Database generic
          .update({ wallet_address: walletAddress })
          .eq("id", profile.id);

        if (updateError) {
          console.error(
            "Error updating wallet address in database:",
            updateError
          );
        }

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
        queryClient.invalidateQueries({ queryKey: ["my-certificates"] });

        toast.success("Wallet linked successfully!");
      } else {
        toast.error(result.error || "Failed to link wallet");
      }
    } catch (error) {
      console.error("Error linking wallet:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to link wallet"
      );
    } finally {
      setLinkingWallet(false);
    }
  };

  const handleTransferCertificate = async (certificateId: string) => {
    if (
      !account ||
      !profile?.popchain_account_address ||
      !profile?.wallet_address
    ) {
      toast.error(
        "Please link your wallet first before transferring certificates"
      );
      return;
    }

    setTransferringCertId(certificateId);
    try {
      const result = await transferCertificateToWallet(
        profile.popchain_account_address,
        certificateId,
        suiClient,
        signAndExecute
      );

      if (result.success) {
        // Wait a moment for blockchain state to update, then refresh
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["my-certificates"] });
        }, 1000);

        toast.success("Certificate transferred to wallet successfully!");
      } else {
        // Error message is already parsed and user-friendly from parseError
        toast.error(result.error || "Failed to transfer certificate");
      }
    } catch (error) {
      console.error("Error transferring certificate:", error);

      // Parse error and get user-friendly message
      const errorMessage = parseError(error);
      toast.error(errorMessage);
    } finally {
      setTransferringCertId(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            My Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            My Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load certificates</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile?.popchain_account_address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            My Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Please complete your registration to view certificates
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const certificateList = certificates || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          My Certificates
          {certificateList.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {certificateList.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {certificateList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No certificates yet</p>
            <p className="text-sm text-muted-foreground">
              Certificates will appear here after you claim them from events
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {certificateList.map((certificate) => (
              <div
                key={certificate.objectId}
                className="relative border rounded-lg overflow-hidden bg-muted group hover:shadow-lg transition-shadow"
              >
                <div className="relative bg-gradient-to-br from-purple-500/20 to-blue-500/20 overflow-hidden">
                  {/* Certificate image - aspect ratio determined by image */}
                  {certificate.imageUrl ? (
                    <img
                      src={certificate.imageUrl}
                      alt={`${certificate.tier.name} Certificate`}
                      className="w-full h-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full aspect-[9/16] flex items-center justify-center">
                      <Award className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  {/* Tier data - similar to organizer dashboard */}
                  <div className="flex items-center gap-2">
                    {certificate.tierImageUrl && (
                      <img
                        src={certificate.tierImageUrl}
                        alt={certificate.tier.name}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        {certificate.tier.name || "Certificate"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {certificate.tier.level && certificate.tier.description
                          ? `${certificate.tier.level} • ${certificate.tier.description}`
                          : certificate.tier.level ||
                            certificate.tier.description ||
                            ""}
                      </p>
                    </div>
                  </div>

                  {/* Certificate ID */}
                  <p className="text-xs text-muted-foreground mt-2 truncate font-mono">
                    ID: {certificate.objectId.slice(0, 8)}...
                  </p>

                  {/* Transfer Certificate Button / Status */}
                  {!profile?.wallet_address ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={handleLinkWallet}
                      disabled={linkingWallet || !account}
                    >
                      {linkingWallet ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" />
                          Linking...
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4 mr-2" />
                          Link Wallet to Transfer
                        </>
                      )}
                    </Button>
                  ) : certificate.ownerAddress === profile.wallet_address ? (
                    <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-md">
                      <div className="flex items-center gap-2 text-sm">
                        <Wallet className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-green-600 dark:text-green-400 font-medium">
                            Transferred to Wallet
                          </p>
                          <p className="text-xs text-muted-foreground truncate font-mono">
                            {profile.wallet_address.slice(0, 6)}...
                            {profile.wallet_address.slice(-4)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() =>
                        handleTransferCertificate(certificate.objectId)
                      }
                      disabled={
                        transferringCertId === certificate.objectId || !account
                      }
                    >
                      {transferringCertId === certificate.objectId ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" />
                          Transferring...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Transfer to Wallet
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
