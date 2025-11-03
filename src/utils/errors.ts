/**
 * Error code mappings for PopChain smart contract errors
 * Based on smart-contracts/popchain_errors.md
 */
export const ERROR_CODES = {
  E_NOT_ORGANIZER: 1,
  E_NOT_ATTENDEE: 2,
  E_NOT_WHITELISTED: 3,
  E_INSUFFICIENT_FUNDS: 4,
  E_EVENT_CLOSED: 5,
  E_ALREADY_CLAIMED: 6,
  E_UNAUTHORIZED: 7,
  E_INVALID_ROLE: 8,
  E_INVALID_TIER: 9,
  E_NO_TIERS: 10,
  E_EVENT_NOT_FOUND: 11,
  E_ACCOUNT_NOT_FOUND: 12,
  E_TREASURY_NOT_FOUND: 13,
  E_INVALID_ADDRESS: 14,
} as const;

/**
 * User-friendly error messages for each error code
 */
const ERROR_MESSAGES: Record<number, string> = {
  [ERROR_CODES.E_NOT_ORGANIZER]:
    "This action requires organizer permissions. Only organizers can perform this action.",
  [ERROR_CODES.E_NOT_ATTENDEE]:
    "This action requires attendee permissions. Only attendees can perform this action.",
  [ERROR_CODES.E_NOT_WHITELISTED]:
    "You are not whitelisted for this event. Please contact the event organizer to be added to the whitelist.",
  [ERROR_CODES.E_INSUFFICIENT_FUNDS]:
    "Insufficient funds. Please add more SUI to your PopChain account to complete this transaction.",
  [ERROR_CODES.E_EVENT_CLOSED]:
    "This event is closed. Certificates can no longer be minted for this event.",
  [ERROR_CODES.E_ALREADY_CLAIMED]:
    "You have already claimed this certificate. Each certificate can only be claimed once.",
  [ERROR_CODES.E_UNAUTHORIZED]:
    "Unauthorized action. You do not have permission to perform this operation.",
  [ERROR_CODES.E_INVALID_ROLE]:
    "Invalid user role. Please check your account settings.",
  [ERROR_CODES.E_INVALID_TIER]:
    "Invalid tier selected. Please choose a valid tier for this event.",
  [ERROR_CODES.E_NO_TIERS]:
    "This event has no tiers configured. Please contact the event organizer.",
  [ERROR_CODES.E_EVENT_NOT_FOUND]:
    "Event not found. The event may have been deleted or does not exist on-chain.",
  [ERROR_CODES.E_ACCOUNT_NOT_FOUND]:
    "Account not found. Your PopChain account may not exist on-chain. Please complete your registration.",
  [ERROR_CODES.E_TREASURY_NOT_FOUND]:
    "Platform treasury not found. Please contact support.",
  [ERROR_CODES.E_INVALID_ADDRESS]:
    "Invalid address. Please ensure your wallet is properly connected and linked to your account.",
};

/**
 * Extract error code from Sui transaction error
 * Sui errors can come in different formats:
 * - MoveAbort with code number
 * - String error messages containing code
 * - JSON error objects
 */
export function extractErrorCode(error: unknown): number | null {
  if (!error) return null;

  const errorString = typeof error === "string" ? error : JSON.stringify(error);

  // Try to extract MoveAbort code from error message
  // Format: MoveAbort(..., code) where code is a number
  const moveAbortMatch = errorString.match(/MoveAbort\([^,]+,\s*(\d+)\)/);
  if (moveAbortMatch) {
    return parseInt(moveAbortMatch[1], 10);
  }

  // Try to extract error code from JSON if it's an object
  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;

    // Check for error code in various possible locations
    if (typeof errorObj.code === "number") {
      return errorObj.code;
    }
    if (typeof errorObj.errorCode === "number") {
      return errorObj.errorCode;
    }
    if (typeof errorObj.moveAbortCode === "number") {
      return errorObj.moveAbortCode;
    }

    // Check in nested structures
    if (errorObj.details && typeof errorObj.details === "object") {
      const details = errorObj.details as Record<string, unknown>;
      if (typeof details.code === "number") {
        return details.code;
      }
    }
  }

  // Try to extract code from error message string patterns
  const codePatterns = [
    /error code\s*[:=]\s*(\d+)/i,
    /code\s*[:=]\s*(\d+)/i,
    /abort code\s*[:=]\s*(\d+)/i,
  ];

  for (const pattern of codePatterns) {
    const match = errorString.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(errorCode: number): string {
  return (
    ERROR_MESSAGES[errorCode] ||
    `Transaction failed with error code ${errorCode}. Please try again or contact support if the issue persists.`
  );
}

/**
 * Parse error and return user-friendly message
 * Extracts error code from Sui errors and maps to user-friendly messages
 */
export function parseError(error: unknown): string {
  // First, try to extract error code
  const errorCode = extractErrorCode(error);
  if (errorCode !== null) {
    return getErrorMessage(errorCode);
  }

  // If no error code found, check for common error patterns
  const errorString = error instanceof Error ? error.message : String(error);

  // Check for specific error messages
  if (
    errorString.includes("not whitelisted") ||
    errorString.includes("whitelist")
  ) {
    return ERROR_MESSAGES[ERROR_CODES.E_NOT_WHITELISTED];
  }

  if (
    errorString.includes("unauthorized") ||
    errorString.includes("Unauthorized")
  ) {
    return ERROR_MESSAGES[ERROR_CODES.E_UNAUTHORIZED];
  }

  if (errorString.includes("insufficient") || errorString.includes("funds")) {
    return ERROR_MESSAGES[ERROR_CODES.E_INSUFFICIENT_FUNDS];
  }

  if (errorString.includes("event closed") || errorString.includes("closed")) {
    return ERROR_MESSAGES[ERROR_CODES.E_EVENT_CLOSED];
  }

  if (
    errorString.includes("already claimed") ||
    errorString.includes("claimed")
  ) {
    return ERROR_MESSAGES[ERROR_CODES.E_ALREADY_CLAIMED];
  }

  if (errorString.includes("not found") && errorString.includes("event")) {
    return ERROR_MESSAGES[ERROR_CODES.E_EVENT_NOT_FOUND];
  }

  if (errorString.includes("not found") && errorString.includes("account")) {
    return ERROR_MESSAGES[ERROR_CODES.E_ACCOUNT_NOT_FOUND];
  }

  if (errorString.includes("invalid address")) {
    return ERROR_MESSAGES[ERROR_CODES.E_INVALID_ADDRESS];
  }

  // Fallback to original error message
  return errorString || "An unexpected error occurred. Please try again.";
}
