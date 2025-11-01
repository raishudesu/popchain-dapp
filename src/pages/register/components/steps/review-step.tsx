import { Check } from "lucide-react";
import type { RegistrationFormData } from "@/types/registration";

interface ReviewStepProps {
  formData: RegistrationFormData;
}

export function ReviewStep({ formData }: ReviewStepProps) {
  const reviewItems = [
    {
      label: "Full Name",
      value: `${formData.firstName} ${formData.lastName}`,
    },
    {
      label: "Email",
      value: formData.email,
    },
    {
      label: "User Type",
      value:
        formData.userType === "organizer"
          ? "Event Organizer"
          : "Event Attendee",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
        <Check className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-green-900 dark:text-green-100">
            All information looks good!
          </p>
          <p className="text-sm text-green-800 dark:text-green-200 mt-1">
            Please review your details before completing registration.
          </p>
        </div>
      </div>

      <div className="space-y-3 mt-6">
        {reviewItems.map((item) => (
          <div
            key={item.label}
            className="flex justify-between items-center p-4 bg-muted rounded-lg"
          >
            <span className="text-sm font-medium text-muted-foreground">
              {item.label}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
        <p className="text-xs text-muted-foreground">
          By clicking "Complete Registration", you agree to our Terms of Service
          and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
