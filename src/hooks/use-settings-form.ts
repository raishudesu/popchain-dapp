import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsSchema, type SettingsFormData } from "@/schemas/settings";
import { useAuth } from "@/contexts/auth-context";
import {
  updateProfile,
  updatePassword,
  hasProfileChanged,
} from "@/services/settings";

export function useSettingsForm() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    mode: "onChange",
    defaultValues: {
      firstName: profile?.first_name || "",
      lastName: profile?.last_name || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [profile, form]);

  const handleSubmit = async (data: SettingsFormData) => {
    if (!profile) {
      toast.error("User profile not found");
      return;
    }

    setIsSubmitting(true);
    try {
      let profileUpdated = false;
      let passwordUpdated = false;

      // Update profile name if changed
      if (hasProfileChanged(profile, data)) {
        const result = await updateProfile(profile.id, {
          firstName: data.firstName,
          lastName: data.lastName,
        });

        if (!result.success) {
          toast.error(result.error || "Failed to update profile information");
          return;
        }

        profileUpdated = true;

        // Invalidate and refetch profile
        await queryClient.invalidateQueries({
          queryKey: ["auth", "profile", profile.id],
        });
      }

      // Update password if provided
      if (data.newPassword && data.currentPassword) {
        const result = await updatePassword({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        });

        if (!result.success) {
          // Set form error for current password if verification failed
          if (result.error?.includes("incorrect")) {
            form.setError("currentPassword", {
              type: "manual",
              message: result.error,
            });
          }
          toast.error(result.error || "Failed to update password");
          return;
        }

        passwordUpdated = true;

        // Clear password fields after successful update
        form.reset({
          ...form.getValues(),
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }

      // Show success messages
      if (profileUpdated && passwordUpdated) {
        toast.success("Profile and password updated successfully!");
      } else if (profileUpdated) {
        toast.success("Profile updated successfully!");
      } else if (passwordUpdated) {
        toast.success("Password updated successfully!");
      }
    } catch (error) {
      console.error("Settings update error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    isSubmitting,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    handleSubmit,
  };
}

