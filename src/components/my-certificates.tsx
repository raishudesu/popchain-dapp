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
  getTierBadgeColor,
  getTierByName,
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
          return cert ? { ...cert, id } : null;
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {certificateList.map((certificate) => (
              <div
                key={certificate.objectId}
                className="relative border rounded-lg overflow-hidden bg-muted group hover:shadow-lg transition-shadow"
              >
                <div className="aspect-[9/16] relative">
                  {/* Certificate image placeholder - we need to get the image URL from the certificate URL hash */}
                  <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                    <Award className="w-16 h-16 text-muted-foreground/50" />
                  </div>
                  <div className="absolute top-2 left-2 bg-background/90 px-2 py-1 rounded text-xs font-medium">
                    {certificate.tier.name || "Certificate"}
                  </div>
                  {(() => {
                    const tier = getTierByName(
                      certificate.tier.name as TierName
                    );
                    return tier && certificate.tier.level ? (
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant="outline"
                          className={getTierBadgeColor(tier)}
                        >
                          {certificate.tier.level}
                        </Badge>
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold truncate">
                    {certificate.tier.name || "Certificate"}
                  </p>
                  {certificate.tier.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {certificate.tier.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 truncate font-mono">
                    {certificate.objectId.slice(0, 8)}...
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
