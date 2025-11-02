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
import { Upload, CheckCircle2, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import type { Event } from "@/types/database";
import {
  fetchEventById,
  fetchWhitelistingsWithNames,
  whitelistCSVEmails,
  type WhitelistingWithName,
  type WhitelistingProgress,
} from "@/services/events";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import PopLoader from "@/components/pop-loader";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  // Fetch whitelistings with names
  const {
    data: whitelistings = [],
    isLoading: whitelistingsLoading,
    refetch: refetchWhitelistings,
  } = useQuery<WhitelistingWithName[]>({
    queryKey: ["whitelistings", eventId],
    queryFn: () => (eventId ? fetchWhitelistingsWithNames(eventId) : []),
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
      const finalProgress = await whitelistCSVEmails(
        eventId,
        file,
        suiClient,
        signAndExecute,
        (progress) => {
          setProgress(progress);
        }
      );

      toast.success(
        `Whitelisting complete! ${finalProgress.succeeded}/${finalProgress.total} emails whitelisted successfully.`
      );

      refetch(); // Refresh event data
      refetchWhitelistings(); // Refresh whitelistings table
    } catch (error) {
      console.error("Error processing CSV:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process CSV file";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (isLoading) {
    return <PopLoader />;
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Input
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
                <Progress
                  value={(progress.processed / progress.total) * 100}
                  className="h-2"
                />
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
            <div className="flex justify-between flex-col md:flex-row">
              <span className="text-muted-foreground">Event ID:</span>
              <span className="font-mono text-sm truncate">
                {event.event_id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={event.active ? "text-green-600" : "text-red-600"}
              >
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

      <Card>
        <CardHeader>
          <CardTitle>Whitelisted Attendees</CardTitle>
        </CardHeader>
        <CardContent>
          {whitelistingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6" />
            </div>
          ) : whitelistings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No whitelisted attendees yet. Upload a CSV to whitelist emails.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Whitelisted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whitelistings.map((whitelisting) => (
                    <TableRow key={whitelisting.id}>
                      <TableCell>
                        {whitelisting.name || (
                          <span className="text-muted-foreground">
                            Not registered
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {whitelisting.email}
                      </TableCell>
                      <TableCell>
                        {new Date(whitelisting.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventDetailsPage;
