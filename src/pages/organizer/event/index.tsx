import { useParams } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  useSuiClient,
  useSignAndExecuteTransaction,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  CheckCircle2,
  XCircle,
  Users,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Event } from "@/types/database";
import {
  fetchEventById,
  fetchWhitelistingsWithNames,
  whitelistCSVEmails,
  whitelistEmail,
  removeFromWhitelist,
  closeEvent,
  type WhitelistingWithName,
  type WhitelistingProgress,
} from "@/services/events";
import {
  getDefaultCertificateOptions,
  uploadAndCreateCertificate,
  fetchCertificatesByEventId,
  deleteCertificate,
  createCertificateFromDefault,
  type DefaultCertificateOption,
} from "@/services/certificates";
import type { TierName } from "@/lib/certificate-tiers";
import { Label } from "@/components/ui/label";
import type { Certificate } from "@/types/database";
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
import BackButton from "@/components/back-button";
import { useAuth } from "@/contexts/auth-context";
import { CloseEventDialog } from "@/pages/organizer/components/close-event-dialog";
import { CreateCertificateDialog } from "@/pages/organizer/components/create-certificate-dialog";
import { QRCodeDialog } from "@/pages/organizer/components/qr-code-dialog";
import { DeleteCertificateDialog } from "@/pages/organizer/components/delete-certificate-dialog";

const EventDetailsPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingCertificate, setIsCreatingCertificate] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierName>("PopPass");
  const [selectedDefaultLayout, setSelectedDefaultLayout] =
    useState<DefaultCertificateOption | null>(null);
  const [progress, setProgress] = useState<WhitelistingProgress | null>(null);
  const [singleEmail, setSingleEmail] = useState("");
  const [isAddingSingleEmail, setIsAddingSingleEmail] = useState(false);
  const [showCloseEventDialog, setShowCloseEventDialog] = useState(false);
  const [isClosingEvent, setIsClosingEvent] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();
  const { user } = useAuth();

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

  // Fetch default certificate options
  const { data: defaultCertificateOptions = [] } = useQuery<
    DefaultCertificateOption[]
  >({
    queryKey: ["defaultCertificateOptions"],
    queryFn: getDefaultCertificateOptions,
  });

  // Fetch custom certificates for this event
  const {
    data: customCertificates = [],
    isLoading: certificatesLoading,
    refetch: refetchCertificates,
  } = useQuery<Certificate[]>({
    queryKey: ["certificates", eventId],
    queryFn: () => (eventId ? fetchCertificatesByEventId(eventId) : []),
    enabled: !!eventId,
  });

  const handleAddSingleEmail = async () => {
    if (!singleEmail.trim() || !eventId || !account) {
      toast.error("Please enter a valid email and ensure wallet is connected");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(singleEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsAddingSingleEmail(true);
    try {
      const result = await whitelistEmail(
        eventId,
        singleEmail.trim(),
        suiClient,
        signAndExecute
      );

      if (result.success) {
        toast.success(`Email ${singleEmail.trim()} whitelisted successfully!`);
        setSingleEmail("");
        refetch(); // Refresh event data
        refetchWhitelistings(); // Refresh whitelistings table
      } else {
        toast.error(result.error || "Failed to whitelist email");
      }
    } catch (error) {
      console.error("Error whitelisting email:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to whitelist email";
      toast.error(errorMessage);
    } finally {
      setIsAddingSingleEmail(false);
    }
  };

  const handleRemoveFromWhitelist = async (email: string) => {
    if (!eventId || !account) {
      toast.error("Please ensure wallet is connected");
      return;
    }

    setRemovingEmail(email);
    try {
      const result = await removeFromWhitelist(
        eventId,
        email,
        suiClient,
        signAndExecute
      );

      if (result.success) {
        toast.success(`Email ${email} removed from whitelist successfully!`);
        refetch(); // Refresh event data
        refetchWhitelistings(); // Refresh whitelistings table
      } else {
        toast.error(result.error || "Failed to remove email from whitelist");
      }
    } catch (error) {
      console.error("Error removing email from whitelist:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to remove email from whitelist";
      toast.error(errorMessage);
    } finally {
      setRemovingEmail(null);
    }
  };

  const handleCloseEvent = async () => {
    if (!eventId || !account) {
      toast.error("Please ensure wallet is connected");
      return;
    }

    setIsClosingEvent(true);
    try {
      const result = await closeEvent(eventId, suiClient, signAndExecute);

      if (result.success) {
        toast.success("Event closed successfully!");
        setShowCloseEventDialog(false);
        refetch(); // Refresh event data
      } else {
        toast.error(result.error || "Failed to close event");
      }
    } catch (error) {
      console.error("Error closing event:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to close event";
      toast.error(errorMessage);
    } finally {
      setIsClosingEvent(false);
    }
  };

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

  // Handle certificate creation
  const handleCreateCertificate = async () => {
    if (!eventId || !user) {
      toast.error("Please ensure you're logged in");
      return;
    }

    if (!selectedTier) {
      toast.error("Please select a tier");
      return;
    }

    setIsCreatingCertificate(true);

    try {
      // Check if using default layout or custom upload
      if (selectedDefaultLayout) {
        // Create from default layout
        await createCertificateFromDefault(
          selectedDefaultLayout.url,
          selectedDefaultLayout.index,
          eventId,
          user.id,
          selectedTier
        );
        toast.success("Certificate created successfully!");
      } else {
        // Check if custom file is selected
        const file = certificateInputRef.current?.files?.[0];
        if (!file) {
          toast.error(
            "Please select a default layout or upload a custom image"
          );
          return;
        }

        // Upload custom certificate
        await uploadAndCreateCertificate(file, eventId, user.id, selectedTier);
        toast.success("Certificate created successfully!");
      }

      // Reset form
      setSelectedDefaultLayout(null);
      setSelectedTier("PopPass");
      if (certificateInputRef.current) {
        certificateInputRef.current.value = "";
      }
      refetchCertificates();
    } catch (error) {
      console.error("Error creating certificate:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create certificate";
      toast.error(errorMessage);
    } finally {
      setIsCreatingCertificate(false);
    }
  };

  const handleCancelCreateCertificate = () => {
    setSelectedDefaultLayout(null);
    setSelectedTier("PopPass");
    if (certificateInputRef.current) {
      certificateInputRef.current.value = "";
    }
  };

  const handleDeleteCertificate = (certificateId: string, imageUrl: string) => {
    deleteCertificateMutation.mutate({ certificateId, imageUrl });
  };

  // Delete certificate mutation
  const deleteCertificateMutation = useMutation({
    mutationFn: ({
      certificateId,
      imageUrl,
    }: {
      certificateId: string;
      imageUrl: string;
    }) => deleteCertificate(certificateId, imageUrl),
    onSuccess: () => {
      toast.success("Certificate deleted successfully");
      refetchCertificates();
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete certificate: ${error.message}`);
    },
  });

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
      <BackButton />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {event.name}
          </h1>
          <p className="text-muted-foreground">{event.description}</p>
        </div>
        {event.active && (
          <>
            <Button
              variant="destructive"
              disabled={!account || isClosingEvent}
              className="flex items-center gap-2"
              onClick={() => setShowCloseEventDialog(true)}
            >
              <X className="w-4 h-4" />
              Close Event
            </Button>
            <CloseEventDialog
              open={showCloseEventDialog}
              onOpenChange={setShowCloseEventDialog}
              onConfirm={handleCloseEvent}
              isClosing={isClosingEvent}
            />
          </>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Whitelist Attendees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!event.active && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  This event is closed. You cannot add new whitelist entries.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Add a single email or upload a CSV file with attendee emails.
                Each email will be whitelisted on-chain and recorded in the
                database.
              </p>
              <p className="text-xs text-muted-foreground">
                CSV format: One email per line, or emails in the first column
              </p>
            </div>

            {/* Single Email Input */}
            <div className="space-y-2">
              <Label htmlFor="single-email">Add Single Email</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="single-email"
                  type="email"
                  placeholder="attendee@example.com"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  disabled={
                    isAddingSingleEmail ||
                    isUploading ||
                    !account ||
                    !event.active
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !isAddingSingleEmail &&
                      event.active
                    ) {
                      handleAddSingleEmail();
                    }
                  }}
                />
                <Button
                  onClick={handleAddSingleEmail}
                  disabled={
                    isAddingSingleEmail ||
                    isUploading ||
                    !account ||
                    !singleEmail.trim() ||
                    !event.active
                  }
                  className="btn-gradient"
                  size="icon"
                >
                  {isAddingSingleEmail ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* CSV Upload */}
            <div className="space-y-2">
              <Label htmlFor="csv-upload">Bulk Upload (CSV)</Label>
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={
                    isUploading ||
                    isAddingSingleEmail ||
                    !account ||
                    !event.active
                  }
                  className="hidden"
                  id="csv-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    isUploading ||
                    isAddingSingleEmail ||
                    !account ||
                    !event.active
                  }
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
                    <TableHead>Email</TableHead>
                    <TableHead>Whitelisted</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whitelistings.map((whitelisting) => (
                    <TableRow key={whitelisting.id}>
                      <TableCell className="font-mono text-sm">
                        {whitelisting.email}
                      </TableCell>
                      <TableCell>
                        {new Date(whitelisting.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {event.active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemoveFromWhitelist(whitelisting.email)
                            }
                            disabled={
                              removingEmail === whitelisting.email || !account
                            }
                            className="h-8 w-8 p-0"
                          >
                            {removingEmail === whitelisting.email ? (
                              <Spinner className="w-4 h-4" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-destructive" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Certificates</CardTitle>
            <CreateCertificateDialog
              selectedTier={selectedTier}
              onTierChange={setSelectedTier}
              selectedDefaultLayout={selectedDefaultLayout}
              onDefaultLayoutChange={setSelectedDefaultLayout}
              defaultCertificateOptions={defaultCertificateOptions}
              onCreate={handleCreateCertificate}
              onCancel={handleCancelCreateCertificate}
              isCreating={isCreatingCertificate}
              eventActive={event.active}
              certificateInputRef={
                certificateInputRef as React.RefObject<HTMLInputElement | null>
              }
              user={user}
            />
          </div>
        </CardHeader>
        <CardContent>
          {!event.active && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                This event is closed. You cannot create new certificates.
              </p>
            </div>
          )}
          {certificatesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6" />
            </div>
          ) : customCertificates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No certificates created yet. Click "Create Certificate" to get
              started.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-center justify-center">
              {customCertificates.map((certificate) => (
                <div
                  key={certificate.id}
                  className="relative border rounded-lg overflow-hidden bg-muted group"
                >
                  <div className="relative">
                    <img
                      src={certificate.image_url}
                      alt={certificate.name || "Certificate"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-background/90 px-2 py-1 rounded text-xs font-medium">
                      {certificate.name || "Certificate"}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <QRCodeDialog certificate={certificate} />
                      <DeleteCertificateDialog
                        certificate={certificate}
                        onConfirm={handleDeleteCertificate}
                        isDeleting={deleteCertificateMutation.isPending}
                      />
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {certificate.tier_image_url && (
                        <img
                          src={certificate.tier_image_url}
                          alt={certificate.tier_name}
                          className="w-6 h-6 object-contain"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-sm">
                          {certificate.tier_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {certificate.tier_level} •{" "}
                          {certificate.tier_description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventDetailsPage;
