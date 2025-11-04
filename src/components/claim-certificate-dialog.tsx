import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import type { Certificate } from "@/types/database";
import type { Event } from "@/types/database";
import { getEventFromBlockchain } from "@/services/events";
import {
  mintCertificateForAttendeeSponsored,
  getCertificateMintingData,
} from "@/services/certificate-minting";
import type { SuiClient } from "@mysten/sui/client";
import { useAuth } from "@/contexts/auth-context";
import {
  getTierBadgeColor,
  getTierByName,
  type TierName,
} from "@/lib/certificate-tiers";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";
import { popchainErrorDecoder } from "@/utils/errors";
import { useNavigate } from "react-router";

interface ClaimCertificateDialogProps {
  certificateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed?: () => void;
  onClaimFailedNotWhitelisted?: () => void;
  suiClient: SuiClient;
  certificate?: Certificate | null; // Optional pre-fetched certificate
}

export function ClaimCertificateDialog({
  certificateId,
  open,
  onOpenChange,
  onClaimed,
  onClaimFailedNotWhitelisted,
  suiClient,
  certificate: certificateProp,
}: ClaimCertificateDialogProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();
  // Use certificate from prop (parent manages fetching)
  const certificate = certificateProp || null;

  // Fetch event from blockchain when certificate becomes available
  useEffect(() => {
    if (!open || !certificateId) {
      return;
    }

    // Only fetch event if we have a certificate
    if (!certificate) {
      return;
    }

    // Fetch event data from blockchain (event_id is a blockchain object ID)
    const loadEvent = async () => {
      try {
        const blockchainEvent = await getEventFromBlockchain(
          certificate.event_id,
          suiClient
        );

        if (blockchainEvent) {
          // Convert blockchain event to database Event format for compatibility
          setEvent({
            event_id: certificate.event_id,
            organizer_id: "", // Not available from blockchain
            organizer_account_address: blockchainEvent.organizerAccount,
            name: blockchainEvent.name,
            description: blockchainEvent.description,
            active: blockchainEvent.active,
            created_at: new Date().toISOString(), // Not available from blockchain
            updated_at: new Date().toISOString(), // Not available from blockchain
          } as Event);
        } else {
          setEvent(null);
        }
      } catch (error) {
        console.error("Error loading event data from blockchain:", error);
        // Silently handle errors - certificate can still be claimed without event details
        setEvent(null);
      }
    };

    loadEvent();
  }, [open, certificateId, certificate, suiClient]);

  const handleClaim = async () => {
    if (!certificate || !profile) {
      toast.error("Missing required information to claim certificate");
      return;
    }

    // Event is optional for claiming - we only need certificate and profile

    // Wallet connection not needed - transaction is sponsored by organizer via service wallet
    setIsClaiming(true);

    try {
      // Get minting data (try database first, fallback to blockchain)
      const mintingData = await getCertificateMintingData(
        certificate,
        suiClient
      );
      if (!mintingData) {
        throw new Error(
          "Failed to get minting data. Could not find organizer account address."
        );
      }

      // If user doesn't have a PopChain account, create one automatically
      const attendeeAccountId = profile.popchain_account_address || "";
      if (!attendeeAccountId) {
        navigate("/login");
      }

      // Use sponsored transaction - service wallet (treasury owner) signs and sponsors the transaction
      // The organizer's PopChainAccount will be charged the minting fee via charge_platform_fee
      // Attendee doesn't need wallet connected - transaction is fully sponsored by platform owner
      const result = await mintCertificateForAttendeeSponsored(
        certificate,
        mintingData.organizerAccountId,
        attendeeAccountId,
        profile.email,
        suiClient
      );

      if (result.success) {
        toast.success("Certificate claimed successfully!");
        onClaimed?.();
        onOpenChange(false);
      } else {
        // Decode the error to get error code and message
        const parsedError = popchainErrorDecoder.parseError(result.error);

        toast.error(parsedError.message);
        onClaimFailedNotWhitelisted?.();
      }
    } catch (error) {
      console.error("Error claiming certificate:", error);

      // Use the reusable PopChain error decoder
      const parsedError = popchainErrorDecoder.parseError(error);

      toast.error(parsedError.message);
      onClaimFailedNotWhitelisted?.();
    } finally {
      setIsClaiming(false);
    }
  };

  // Show loading state while certificate or event is loading
  if (!certificate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTitle className="sr-only">Unclaimed Certificate</DialogTitle>
        <DialogDescription className="sr-only">
          You have an unclaimed certificate ready to mint! Claim it to receive
          your NFT certificate on-chain.
        </DialogDescription>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const tier = getTierByName(certificate.tier_name as TierName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Unclaimed Certificate
          </DialogTitle>
          <DialogDescription>
            You have an unclaimed certificate ready to mint! Claim it to receive
            your NFT certificate on-chain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Certificate Preview */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative border rounded-lg overflow-hidden bg-muted">
              <img
                src={certificate.image_url}
                alt={certificate.name || "Certificate"}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-center space-y-2">
              <p className="font-semibold">
                {certificate.name || "Certificate"}
              </p>
              {event && (
                <>
                  <p>Event: {event.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.description}
                  </p>
                </>
              )}
              {tier && (
                <Badge variant="outline" className={getTierBadgeColor(tier)}>
                  <span className="font-semibold">{certificate.tier_name}</span>
                  <span className="text-xs opacity-80 ml-1">
                    {certificate.tier_level}
                  </span>
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isClaiming}
          >
            Later
          </Button>
          <Button
            onClick={handleClaim}
            disabled={isClaiming}
            className="btn-gradient"
          >
            {isClaiming ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Claiming...
              </>
            ) : (
              "Claim Certificate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
