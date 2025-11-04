import { SuiClientErrorDecoder } from "suiclient-error-decoder";

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
 * Parse MoveAbort error code from error message
 * @param errorMessage - Error message string
 * @returns Error code number or null if not found
 */
export function parseMoveAbortCode(errorMessage: string): number | null {
  const match = errorMessage.match(/MoveAbort\(.*?,\s*(\d+)\)/);
  return match ? Number(match[1]) : null;
}

/**
 * Create and export a reusable SuiClientErrorDecoder with PopChain custom error codes
 * Maps PopChain error codes to user-friendly messages
 */
export const popchainErrorDecoder = new SuiClientErrorDecoder({
  customErrorCodes: {
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
  },
});

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

  // Try to extract MoveAbort code from error message using parseMoveAbortCode
  const moveAbortCode = parseMoveAbortCode(errorString);
  if (moveAbortCode !== null) {
    return moveAbortCode;
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
