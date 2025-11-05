import { z } from "zod";

export const settingsSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .min(2, "First name must be at least 2 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .min(2, "Last name must be at least 2 characters"),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // If newPassword is provided, currentPassword is required
      if (data.newPassword && !data.currentPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Current password is required to set a new password",
      path: ["currentPassword"],
    }
  )
  .refine(
    (data) => {
      // If currentPassword is provided, newPassword is required
      if (data.currentPassword && !data.newPassword) {
        return false;
      }
      return true;
    },
    {
      message: "New password is required when changing password",
      path: ["newPassword"],
    }
  )
  .refine(
    (data) => {
      // If newPassword is provided, it must meet requirements
      if (data.newPassword) {
        return (
          data.newPassword.length >= 8 &&
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.newPassword)
        );
      }
      return true;
    },
    {
      message:
        "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number",
      path: ["newPassword"],
    }
  )
  .refine(
    (data) => {
      // If newPassword is provided, confirmPassword must match
      if (data.newPassword && data.confirmPassword !== data.newPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

export type SettingsFormData = z.infer<typeof settingsSchema>;

