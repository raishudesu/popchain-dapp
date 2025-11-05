import supabase from "@/utils/supabase";
import type { UserProfile } from "@/types/database";

export interface UpdateProfileData {
  firstName: string;
  lastName: string;
}

export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface SettingsUpdateResult {
  success: boolean;
  error?: string;
}

/**
 * Update user profile information (first name and last name)
 */
export async function updateProfile(
  profileId: string,
  data: UpdateProfileData
): Promise<SettingsUpdateResult> {
  try {
    const updateData = {
      first_name: data.firstName,
      last_name: data.lastName,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from("user_profiles")
      // @ts-expect-error - Supabase type inference limitation with update method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updateData as any)
      .eq("id", profileId);

    if (profileError) {
      return {
        success: false,
        error: profileError.message || "Failed to update profile information",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Profile update error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating profile",
    };
  }
}

/**
 * Verify current password and update to new password
 */
export async function updatePassword(
  data: UpdatePasswordData
): Promise<SettingsUpdateResult> {
  try {
    // Get current user email from session
    const { data: sessionData } = await supabase.auth.getSession();
    const userEmail = sessionData?.session?.user?.email;

    if (!userEmail) {
      return {
        success: false,
        error: "Unable to verify password. Please sign in again.",
      };
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: data.currentPassword,
    });

    if (verifyError) {
      return {
        success: false,
        error: "Current password is incorrect",
      };
    }

    // Update password
    const { error: passwordError } = await supabase.auth.updateUser({
      password: data.newPassword,
    });

    if (passwordError) {
      return {
        success: false,
        error:
          passwordError.message ||
          "Failed to update password. Please try again.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Password update error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating password",
    };
  }
}

/**
 * Check if profile data has changed
 */
export function hasProfileChanged(
  profile: UserProfile | null,
  data: UpdateProfileData
): boolean {
  if (!profile) return false;
  return (
    data.firstName !== profile.first_name || data.lastName !== profile.last_name
  );
}
