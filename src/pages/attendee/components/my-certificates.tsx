import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { useAuth } from "@/contexts/auth-context";
import {
  getCertificatesForAccount,
  getCertificateFromBlockchain,
} from "@/services/certificates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import {
  getTierByName,
  getTierImageUrl,
  type TierName,
} from "@/lib/certificate-tiers";

export function MyCertificates() {
  const { profile, loading: authLoading } = useAuth();
  const suiClient = useSuiClient();

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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
