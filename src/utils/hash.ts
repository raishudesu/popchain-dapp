import { sha3_256 } from "js-sha3";

/**
 * Hash an email using SHA-3-256 (Keccak-256 variant)
 * This matches the smart contract implementation in popchain_utils::hash_email
 *
 * @param email - Email address to hash
 * @returns Hex string of the SHA-3-256 hash
 */
export function hashEmail(email: string): string {
  return sha3_256(email);
}

/**
 * Hash an email and return as Uint8Array (byte array)
 * Useful for passing to Move functions that expect vector<u8>
 *
 * @param email - Email address to hash
 * @returns Uint8Array of the SHA-3-256 hash
 */
export function hashEmailToBytes(email: string): Uint8Array {
  const hash = sha3_256(email);
  // Convert hex string to Uint8Array
  const bytes = new Uint8Array(hash.length / 2);
  for (let i = 0; i < hash.length; i += 2) {
    bytes[i / 2] = parseInt(hash.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Hash a URL using SHA-3-256 and return as Uint8Array (byte array)
 * Useful for passing certificate URLs to Move functions that expect vector<u8>
 *
 * @param url - URL to hash
 * @returns Uint8Array of the SHA-3-256 hash
 */
export function hashUrlToBytes(url: string): Uint8Array {
  const hash = sha3_256(url);
  // Convert hex string to Uint8Array
  const bytes = new Uint8Array(hash.length / 2);
  for (let i = 0; i < hash.length; i += 2) {
    bytes[i / 2] = parseInt(hash.substr(i, 2), 16);
  }
  return bytes;
}
