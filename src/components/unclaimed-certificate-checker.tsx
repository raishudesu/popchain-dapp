import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { useAuth } from "@/contexts/auth-context";
import {
  getUnclaimedCertificateId,
  clearUnclaimedCertificateId,
} from "@/utils/unclaimed-certificate";
import { fetchCertificateById } from "@/services/certificates";
import { ClaimCertificateDialog } from "./claim-certificate-dialog";

/**
 * Component that checks for unclaimed certificates in sessionStorage
 * and shows a dialog to claim them.
 *
 * Flow:
 * 1. Attendee scans QR code → unclaimed certificate ID stored in sessionStorage
 * 2. User redirected to login page
 * 3. Once logged in, this component checks sessionStorage
 * 4. If unclaimed certificate exists, dialog pops up for attendee to claim
 */
export function UnclaimedCertificateChecker() {
  const { user, loading: authLoading } = useAuth();
  const suiClient = useSuiClient();
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  // Check for unclaimed certificate once user is logged in
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Only check if user is logged in
    if (!user) {
      return;
    }

    // Only check once per login session
    if (hasChecked) {
      return;
    }

    // Mark as checked to prevent re-checking
    setHasChecked(true);

    // Check sessionStorage for unclaimed certificate ID
    const unclaimedCertId = getUnclaimedCertificateId();
    if (unclaimedCertId) {
      // Found unclaimed certificate, set ID to trigger fetch
      setCertificateId(unclaimedCertId);
    }
  }, [user, authLoading, hasChecked]);

  // Fetch certificate data when we have an ID
  const {
    data: certificate,
    isLoading: isLoadingCertificate,
    isFetched: isCertificateFetched,
  } = useQuery({
    queryKey: ["certificate", certificateId],
    queryFn: () => (certificateId ? fetchCertificateById(certificateId) : null),
    enabled: !!certificateId && !!user,
  });

  // Handle certificate fetch result
  useEffect(() => {
    // Only process after fetch completes
    if (!certificateId || !isCertificateFetched || isLoadingCertificate) {
      return;
    }

    // Certificate not found - clear from sessionStorage and reset state
    if (certificate === null) {
      console.warn("Certificate not found:", certificateId);
      clearUnclaimedCertificateId();
      setCertificateId(null);
      setHasChecked(false); // Allow checking again if new certificate is added
    }
  }, [certificate, certificateId, isCertificateFetched, isLoadingCertificate]);

  // Track dialog open state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);

  // Open dialog when we have a certificate ID (show loading state while fetching)
  // But don't auto-open if user has dismissed it
  useEffect(() => {
    if (certificateId && !isDialogOpen && !userDismissed) {
      setIsDialogOpen(true);
    }
  }, [certificateId, isDialogOpen, userDismissed]);

  // Close dialog if certificate not found (after fetch completes)
  useEffect(() => {
    if (
      certificateId &&
      isCertificateFetched &&
      !isLoadingCertificate &&
      certificate === null
    ) {
      setIsDialogOpen(false);
    }
  }, [certificate, certificateId, isCertificateFetched, isLoadingCertificate]);

  const handleClaimed = () => {
    // Clear sessionStorage and reset state after successful claim
    clearUnclaimedCertificateId();
    setCertificateId(null);
    setIsDialogOpen(false);
    setUserDismissed(false); // Reset dismissed flag
    setHasChecked(false); // Allow checking again if new certificate is added
  };

  const handleDialogClose = (open: boolean) => {
    // Update dialog open state
    setIsDialogOpen(open);

    // If user closes dialog manually, mark as dismissed
    // This prevents it from auto-opening again
    if (!open) {
      setUserDismissed(true);
    }
  };

  // Don't render dialog if no certificate ID
  if (!certificateId) {
    return null;
  }

  // Don't render dialog if certificate not found (after fetch completed)
  if (isCertificateFetched && !isLoadingCertificate && certificate === null) {
    return null;
  }

  return (
    <ClaimCertificateDialog
      certificateId={certificateId}
      open={isDialogOpen}
      onOpenChange={handleDialogClose}
      onClaimed={handleClaimed}
      suiClient={suiClient}
      certificate={certificate || undefined}
    />
  );
}
