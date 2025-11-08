import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  Award,
  Calendar,
  User,
  ExternalLink,
  ImageOff,
} from "lucide-react";
import { getEventFromBlockchain } from "@/services/events";
import type { SuiClient } from "@mysten/sui/client";
import { getTierBadgeColor, getTierByName } from "@/lib/certificate-tiers";
import type { TierName } from "@/lib/certificate-tiers";

interface CertificateDetailsDialogProps {
  certificate: {
    objectId: string;
    eventId: string;
    imageUrl: string | null;
    tier: {
      name: string;
      level: string;
      description: string;
      imageUrl: string;
    };
    tierImageUrl: string | null;
    ownerAddress: string;
  };
  suiClient: SuiClient;
}

export function CertificateDetailsDialog({
  certificate,
  suiClient,
}: CertificateDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image error state when dialog opens
  useEffect(() => {
    if (open) {
      setImageError(false);
    }
  }, [open]);

  // Fetch event details when dialog opens
  const {
    data: event,
    isLoading: eventLoading,
    isError: eventError,
  } = useQuery({
    queryKey: ["event-details", certificate.eventId],
    queryFn: () => getEventFromBlockchain(certificate.eventId, suiClient),
    enabled: open && !!certificate.eventId,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Info className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Certificate Details
          </DialogTitle>
          <DialogDescription>
            View complete information about this certificate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Certificate Image */}
          {certificate.imageUrl && (
            <div className="relative border rounded-lg overflow-hidden bg-muted">
              <div className="relative bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                {imageError ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <ImageOff className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Certificate Image Not Available
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {certificate.tier.name} -{" "}
                      {certificate.tier.level || "Certificate"}
                    </p>
                  </div>
                ) : (
                  <img
                    src={certificate.imageUrl}
                    alt={`${certificate.tier.name} Certificate`}
                    className="w-full h-auto object-contain"
                    onError={() => {
                      setImageError(true);
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Certificate ID */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Info className="w-4 h-4" />
              Certificate ID
            </h3>
            <p className="text-sm text-muted-foreground font-mono break-all">
              {certificate.objectId}
            </p>
          </div>

          {/* Tier Details */}
          <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Award className="w-4 h-4" />
              Tier Details
            </h3>
            <div className="flex items-start gap-3">
              {certificate.tierImageUrl && (
                <img
                  src={certificate.tierImageUrl}
                  alt={certificate.tier.name}
                  className="w-12 h-12 object-contain flex-shrink-0"
                />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{certificate.tier.name}</p>
                  {certificate.tier.level &&
                    (() => {
                      const tierDef = getTierByName(
                        certificate.tier.name as TierName
                      );
                      return (
                        <Badge
                          variant="outline"
                          className={
                            tierDef
                              ? getTierBadgeColor(tierDef.name)
                              : "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
                          }
                        >
                          <span className="text-xs opacity-80 ml-1">
                            {certificate.tier.level}
                          </span>
                        </Badge>
                      );
                    })()}
                </div>
                {certificate.tier.description && (
                  <p className="text-sm text-muted-foreground">
                    {certificate.tier.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Event Details
            </h3>
            {eventLoading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner className="w-5 h-5" />
              </div>
            ) : eventError || !event ? (
              <div className="text-sm text-muted-foreground">
                <p>Unable to load event details</p>
                <p className="text-xs mt-1 font-mono break-all">
                  Event ID: {certificate.eventId}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-sm">{event.name}</p>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={event.active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {event.active ? "Active" : "Closed"}
                  </Badge>
                </div>
                <div className="space-y-1 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Organizer:</span>
                    <span className="font-mono text-xs break-all">
                      {event.organizer || "N/A"}
                    </span>
                  </div>
                  {event.organizerAccount && (
                    <div className="flex items-center gap-2 text-sm">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Account:</span>
                      <span className="font-mono text-xs break-all">
                        {event.organizerAccount.slice(0, 10)}...
                        {event.organizerAccount.slice(-8)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Owner Information */}
          <div className="space-y-2 border rounded-lg p-4 bg-muted/50">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Owner
            </h3>
            <p className="text-sm text-muted-foreground font-mono break-all">
              {certificate.ownerAddress}
            </p>
            {certificate.ownerAddress.startsWith("0x") &&
              certificate.ownerAddress !== "0x0" && (
                <p className="text-xs text-muted-foreground">
                  Owned by wallet address
                </p>
              )}
            {certificate.ownerAddress === "0x0" && (
              <p className="text-xs text-muted-foreground">
                Owned by PopChain Account
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
