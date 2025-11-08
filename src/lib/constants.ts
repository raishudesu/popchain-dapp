// ============ Contract Configuration ============
export const CONTRACT_PACKAGE_ID =
  "0xe454577f112ff19f93e52c0916572e2bc23c13a132c865eb2b1d052cd976754f";

export const PLATFORM_TREASURY_ADDRESS =
  "0x93872c72416fb2ad77bc47864b8722083c93523212c594f8a289f41918124bb4";

// ============ Module Names ============
export const MODULE_NAMES = {
  WALLET: "popchain_wallet",
  USER: "popchain_user",
  EVENT: "popchain_event",
  CERTIFICATE: "popchain_certificate",
  ADMIN: "popchain_admin",
  UTILS: "popchain_utils",
} as const;

// ============ Entry Function Methods ============

// Wallet Module Methods
export const WALLET_METHODS = {
  DEPOSIT: "deposit",
  WITHDRAW: "withdraw",
} as const;

// User Module Methods
export const USER_METHODS = {
  CREATE_ACCOUNT: "create_account",
  LINK_WALLET: "link_wallet",
} as const;

// Event Module Methods
export const EVENT_METHODS = {
  CREATE_EVENT_WITH_DEFAULT_TIERS: "create_event_with_default_tiers",
  ADD_TO_WHITELIST: "add_to_whitelist",
  REMOVE_FROM_WHITELIST: "remove_from_whitelist",
  CLOSE_EVENT: "close_event",
  MINT_CERTIFICATE_FOR_ATTENDEE: "mint_certificate_for_attendee",
} as const;

// Certificate Module Methods
export const CERTIFICATE_METHODS = {
  TRANSFER_CERTIFICATE_TO_WALLET: "transfer_certificate_to_wallet",
} as const;

// Admin Module Methods
export const ADMIN_METHODS = {
  INIT_PLATFORM: "init_platform",
  WITHDRAW_TO_OWNER: "withdraw_to_owner",
} as const;

// ============ Full Function Signatures ============
// Helper to generate full function path: <package_id>::<module>::<method>

export const getFunctionPath = (module: string, method: string): string => {
  return `${CONTRACT_PACKAGE_ID}::${module}::${method}`;
};

// Pre-built function paths for all entry functions
export const FUNCTION_PATHS = {
  // Wallet functions
  WALLET_DEPOSIT: getFunctionPath(MODULE_NAMES.WALLET, WALLET_METHODS.DEPOSIT),
  WALLET_WITHDRAW: getFunctionPath(
    MODULE_NAMES.WALLET,
    WALLET_METHODS.WITHDRAW
  ),

  // User functions
  USER_CREATE_ACCOUNT: getFunctionPath(
    MODULE_NAMES.USER,
    USER_METHODS.CREATE_ACCOUNT
  ),
  USER_LINK_WALLET: getFunctionPath(
    MODULE_NAMES.USER,
    USER_METHODS.LINK_WALLET
  ),

  // Event functions
  EVENT_CREATE_WITH_DEFAULT_TIERS: getFunctionPath(
    MODULE_NAMES.EVENT,
    EVENT_METHODS.CREATE_EVENT_WITH_DEFAULT_TIERS
  ),
  EVENT_ADD_TO_WHITELIST: getFunctionPath(
    MODULE_NAMES.EVENT,
    EVENT_METHODS.ADD_TO_WHITELIST
  ),
  EVENT_REMOVE_FROM_WHITELIST: getFunctionPath(
    MODULE_NAMES.EVENT,
    EVENT_METHODS.REMOVE_FROM_WHITELIST
  ),
  EVENT_CLOSE: getFunctionPath(MODULE_NAMES.EVENT, EVENT_METHODS.CLOSE_EVENT),
  EVENT_MINT_CERTIFICATE: getFunctionPath(
    MODULE_NAMES.EVENT,
    EVENT_METHODS.MINT_CERTIFICATE_FOR_ATTENDEE
  ),

  // Certificate functions
  CERTIFICATE_TRANSFER_TO_WALLET: getFunctionPath(
    MODULE_NAMES.CERTIFICATE,
    CERTIFICATE_METHODS.TRANSFER_CERTIFICATE_TO_WALLET
  ),

  // Admin functions
  ADMIN_INIT_PLATFORM: getFunctionPath(
    MODULE_NAMES.ADMIN,
    ADMIN_METHODS.INIT_PLATFORM
  ),
  ADMIN_WITHDRAW_TO_OWNER: getFunctionPath(
    MODULE_NAMES.ADMIN,
    ADMIN_METHODS.WITHDRAW_TO_OWNER
  ),
} as const;

// ============ Default Values ============
export const DEFAULT_WALLET_ADDRESS = "0x0";

// ============ Type Definitions ============
export type ModuleName = (typeof MODULE_NAMES)[keyof typeof MODULE_NAMES];
export type WalletMethod = (typeof WALLET_METHODS)[keyof typeof WALLET_METHODS];
export type UserMethod = (typeof USER_METHODS)[keyof typeof USER_METHODS];
export type EventMethod = (typeof EVENT_METHODS)[keyof typeof EVENT_METHODS];
export type CertificateMethod =
  (typeof CERTIFICATE_METHODS)[keyof typeof CERTIFICATE_METHODS];
export type AdminMethod = (typeof ADMIN_METHODS)[keyof typeof ADMIN_METHODS];
