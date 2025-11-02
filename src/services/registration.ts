import supabase from "@/utils/supabase";
import { hashEmail } from "@/utils/hash";
import type { RegistrationFormData } from "@/types/registration";
import type { UserProfileInsert } from "@/types/database";

/**
 * Map user type to smart contract role enum
 * 0 = Attendee, 1 = Organizer, 2 = Both
 */
function getUserRole(userType: "organizer" | "attendee"): number {
  return userType === "organizer" ? 1 : 0;
}

export interface RegistrationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

/**
 * Register a new user
 * - Creates Supabase auth user
 * - Creates user profile in database
 * - Hashes email for on-chain operations
 *
 * @param data - Registration form data
 * @param walletAddress - Optional wallet address from connected wallet
 * @param popchainAccountAddress - PopChainAccount object ID from on-chain creation
 * @returns Registration result with user data or error
 */
export async function registerUser(
  data: RegistrationFormData,
  walletAddress: string | null,
  popchainAccountAddress: string
): Promise<RegistrationResult> {
  try {
    // Step 1: Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          user_type: data.userType,
        },
      },
    });

    if (authError) {
      return {
        success: false,
        error: authError.message || "Failed to create account",
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: "User creation failed - no user data returned",
      };
    }

    // Step 2: Hash email using SHA-3-256 (matching smart contract)
    const emailHash = hashEmail(data.email);

    // Step 3: Map user type to smart contract role
    const role = getUserRole(data.userType);

    // Step 4: Create user profile in database
    const profileData: UserProfileInsert = {
      id: authData.user.id,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      email_hash: emailHash,
      user_type: data.userType,
      wallet_address: walletAddress,
      popchain_account_address: popchainAccountAddress,
      role,
      certificates: [],
    };

    const { error: profileError } = await supabase
      .from("user_profiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert([profileData] as any);

    if (profileError) {
      // Note: If profile creation fails, the auth user will still exist
      // You may want to implement a cleanup mechanism on the backend
      console.error("Profile creation error:", profileError);
      return {
        success: false,
        error: profileError.message || "Failed to create user profile",
      };
    }

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email || data.email,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
