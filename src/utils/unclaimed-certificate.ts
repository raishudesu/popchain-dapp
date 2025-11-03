/**
 * Utility functions for managing unclaimed certificates in sessionStorage
 */

const UNCLAIMED_CERTIFICATE_KEY = "unclaimed_certificate_id";

/**
 * Get unclaimed certificate ID from sessionStorage
 */
export function getUnclaimedCertificateId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(UNCLAIMED_CERTIFICATE_KEY);
}

/**
 * Set unclaimed certificate ID in sessionStorage
 */
export function setUnclaimedCertificateId(certId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(UNCLAIMED_CERTIFICATE_KEY, certId);
}

/**
 * Clear unclaimed certificate ID from sessionStorage
 */
export function clearUnclaimedCertificateId(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(UNCLAIMED_CERTIFICATE_KEY);
}
