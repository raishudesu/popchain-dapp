import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  useSuiClient,
  useSignAndExecuteTransaction,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import supabase from "@/utils/supabase";
import type { Event } from "@/types/database";
import { whitelistEmail } from "@/services/events";
import { Spinner } from "@/components/ui/spinner";

async function fetchEventById(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (error) {
    console.error("Error fetching event:", error);
    return null;
  }

  return data;
}

async function parseCSV(file: File): Promise<string[]> {
  const text = await file.text();
  const lines = text.split("\n");
  const emails: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Handle CSV format - emails might be in first column
    const parts = trimmed.split(",");
    const email = parts[0]?.trim().toLowerCase();

    // Basic email validation
    if (email && email.includes("@") && email.includes(".")) {
      emails.push(email);
    }
  }

  return emails;
}

interface WhitelistingProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
}

const EventDetailsPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<WhitelistingProgress | null>(null);
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();

  const {
    data: event,
    isLoading,
    refetch,
  } = useQuery<Event | null>({
    queryKey: ["event", eventId],
    queryFn: () => (eventId ? fetchEventById(eventId) : null),
    enabled: !!eventId,
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !eventId || !account) {
      toast.error("Please select a CSV file and ensure wallet is connected");
      return;
    }

    setIsUploading(true);
    setProgress({ total: 0, processed: 0, succeeded: 0, failed: 0 });

    try {
      // Parse CSV
      const emails = await parseCSV(file);

      if (emails.length === 0) {
        toast.error("No valid emails found in CSV file");
        setIsUploading(false);
        return;
      }

      setProgress({
        total: emails.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
      });

      let succeededCount = 0;
      let failedCount = 0;

      // Whitelist each email sequentially
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];

        try {
          const result = await whitelistEmail(
            eventId,
            email,
            suiClient,
            signAndExecute
          );

          if (result.success) {
            succeededCount++;
            setProgress({
              total: emails.length,
              processed: i + 1,
              succeeded: succeededCount,
              failed: failedCount,
            });
          } else {
            failedCount++;
            setProgress({
              total: emails.length,
              processed: i + 1,
              succeeded: succeededCount,
              failed: failedCount,
            });
            toast.error(`Failed to whitelist ${email}: ${result.error}`);
          }
        } catch (error) {
          failedCount++;
          setProgress({
            total: emails.length,
            processed: i + 1,
            succeeded: succeededCount,
            failed: failedCount,
          });
          console.error(`Error whitelisting ${email}:`, error);
          toast.error(`Failed to whitelist ${email}`);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      toast.success(
        `Whitelisting complete! ${succeededCount}/${emails.length} emails whitelisted successfully.`
      );

      refetch(); // Refresh event data
    } catch (error) {
      console.error("Error processing CSV:", error);
      toast.error("Failed to process CSV file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {event.name}
        </h1>
        <p className="text-muted-foreground">{event.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Whitelist Attendees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with attendee emails. Each email will be
              whitelisted on-chain and recorded in the database.
            </p>
            <p className="text-xs text-muted-foreground">
              CSV format: One email per line, or emails in the first column
            </p>
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading || !account}
              className="hidden"
              id="csv-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !account}
              className="btn-gradient"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Processing..." : "Upload CSV"}
            </Button>
            {!account && (
              <p className="text-sm text-muted-foreground">
                Please connect your wallet to whitelist emails
              </p>
            )}
          </div>

          {progress && progress.total > 0 && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">
                  {progress.processed} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all"
                  style={{
                    width: `${(progress.processed / progress.total) * 100}%`,
                  }}
                />
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{progress.succeeded} succeeded</span>
                </div>
                {progress.failed > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span>{progress.failed} failed</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="w-4 h-4" />
              <span>Processing emails... This may take a while.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <CardTitle>Event Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Event ID:</span>
            <span className="font-mono text-sm">{event.event_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <span className={event.active ? "text-green-600" : "text-red-600"}>
              {event.active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span>{new Date(event.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventDetailsPage;
