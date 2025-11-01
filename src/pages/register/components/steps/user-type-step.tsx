import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Users, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RegistrationFormData } from "@/types/registration";

export function UserTypeStep() {
  const form = useFormContext<RegistrationFormData>();
  const userType = form.watch("userType");

  return (
    <FormField
      control={form.control}
      name="userType"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-base font-medium">
            What best describes you?
          </FormLabel>
          <FormControl>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Attendee Option */}
              <Button
                type="button"
                onClick={() => field.onChange("attendee")}
                className={cn(
                  "p-6 rounded-lg border-2 transition-all duration-200 text-left hover:border-primary hover:bg-muted/50",
                  userType === "attendee"
                    ? "border-primary bg-primary/5"
                    : "border-border",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "p-3 rounded-full",
                      userType === "attendee"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      Attendee
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Join events and discover new experiences
                    </p>
                  </div>
                </div>
              </Button>

              {/* Organizer Option */}
              <Button
                type="button"
                onClick={() => field.onChange("organizer")}
                className={cn(
                  "p-6 rounded-lg border-2 transition-all duration-200 text-left hover:border-primary hover:bg-muted/50",
                  userType === "organizer"
                    ? "border-primary bg-primary/5"
                    : "border-border",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "p-3 rounded-full",
                      userType === "organizer"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Clipboard className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      Organizer
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Create and manage your own events
                    </p>
                  </div>
                </div>
              </Button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
