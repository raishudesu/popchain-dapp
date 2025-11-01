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

  return (
    <FormField
      control={form.control}
      name="userType"
      render={({ field }) => {
        const userType = field.value;
        return (
          <FormItem>
            <FormLabel className="text-base font-medium">
              What best describes you?
            </FormLabel>
            <FormControl>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Attendee Option */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    field.onChange("attendee");
                  }}
                  className={cn(
                    "h-auto p-6 rounded-lg border-2 transition-all duration-200 text-left justify-start",
                    "hover:bg-accent hover:border-accent-foreground/20",
                    "whitespace-normal min-w-0",
                    userType === "attendee"
                      ? "bg-gradient-to-r from-purple-400/10 to-pink-600/10 border-purple-400/50"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex flex-col items-start gap-4 w-full min-w-0">
                    <div
                      className={cn(
                        "p-3 rounded-full transition-colors shrink-0",
                        userType === "attendee"
                          ? "bg-gradient-to-r from-purple-400 to-pink-600 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex-1 w-full min-w-0">
                      <h3 className="font-semibold text-foreground mb-1">
                        Attendee
                      </h3>
                      <p className="text-sm text-muted-foreground break-words">
                        Join events and discover new experiences
                      </p>
                    </div>
                  </div>
                </Button>

                {/* Organizer Option */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    field.onChange("organizer");
                  }}
                  className={cn(
                    "h-auto p-6 rounded-lg border-2 transition-all duration-200 text-left justify-start",
                    "hover:bg-accent hover:border-accent-foreground/20",
                    "whitespace-normal min-w-0",
                    userType === "organizer"
                      ? "bg-gradient-to-r from-purple-400/10 to-pink-600/10 border-purple-400/50"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex flex-col items-start gap-4 w-full min-w-0">
                    <div
                      className={cn(
                        "p-3 rounded-full transition-colors shrink-0",
                        userType === "organizer"
                          ? "bg-gradient-to-r from-purple-400 to-pink-600 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Clipboard className="w-6 h-6" />
                    </div>
                    <div className="flex-1 w-full min-w-0">
                      <h3 className="font-semibold text-foreground mb-1">
                        Organizer
                      </h3>
                      <p className="text-sm text-muted-foreground break-words">
                        Create and manage your own events
                      </p>
                    </div>
                  </div>
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
