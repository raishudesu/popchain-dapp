import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createEventTransaction } from "@/services/events";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import supabase from "@/utils/supabase";
import type { EventInsert } from "@/types/database";

const eventSchema = z.object({
  name: z
    .string()
    .min(1, "Event name is required")
    .max(200, "Event name is too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description is too long"),
});

type EventFormData = z.infer<typeof eventSchema>;

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated?: () => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onEventCreated,
}: CreateEventDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { profile } = useAuth();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleCreateEvent = async (data: EventFormData) => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!profile?.popchain_account_address) {
      toast.error("PopChain account not found. Please complete registration.");
      return;
    }

    setIsCreating(true);
    try {
      // Create transaction
      const tx = createEventTransaction(
        profile.popchain_account_address,
        data.name,
        data.description
      );

      // Execute transaction
      const result = await signAndExecute({
        transaction: tx,
      });

      // Wait for transaction
      const txResult = await suiClient.waitForTransaction({
        digest: result.digest,
        options: {
          showEvents: true,
          showEffects: true,
        },
      });

      // Extract event ID from events
      let eventId: string | null = null;
      if (txResult.events) {
        for (const event of txResult.events) {
          // Look for EventCreated event
          // The event type should be something like: <package_id>::popchain_event::EventCreated
          if (event.type.includes("EventCreated")) {
            const parsedJson = event.parsedJson as { event_id?: string };
            if (parsedJson.event_id) {
              eventId = parsedJson.event_id;
              break;
            }
          }
        }
      }

      if (!eventId) {
        // If we can't find the event ID from events, try to extract from effects
        // Fallback: we might need to query the chain or use a different approach
        toast.error(
          "Event created but could not retrieve event ID. Please refresh the page."
        );
        console.error(
          "Could not find event ID in transaction result:",
          txResult
        );
        form.reset();
        onOpenChange(false);
        onEventCreated?.();
        return;
      }

      // Store event in Supabase
      // TypeScript needs explicit type since we've already validated popchain_account_address exists
      const eventInsert: EventInsert = {
        event_id: eventId,
        name: data.name,
        description: data.description,
        organizer_id: profile.id,
        organizer_account_address: profile.popchain_account_address as string, // Already validated above
        active: true,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase.from("events") as any).insert(
        eventInsert
      );

      if (dbError) {
        console.error("Error storing event in database:", dbError);
        toast.error("Event created on-chain but failed to save to database");
        // Still continue - the event is on-chain
      }

      toast.success("Event created successfully!");
      form.reset();
      onOpenChange(false);
      onEventCreated?.();
    } catch (error) {
      console.error("Create event error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create event"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Create a new event on PopChain. You'll be able to manage whitelist
            and mint certificates for attendees.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleCreateEvent)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter event name"
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter event description"
                      rows={4}
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="btn-gradient"
              >
                {isCreating ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Creating...
                  </>
                ) : (
                  "Create Event"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
