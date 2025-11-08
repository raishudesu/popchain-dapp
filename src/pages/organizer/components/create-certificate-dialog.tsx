import type { RefObject } from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CERTIFICATE_TIERS,
  getTierBadgeColor,
  type TierName,
} from "@/lib/certificate-tiers";
import type { DefaultCertificateOption } from "@/services/certificates";
import { getTierImageUrlByName } from "@/services/certificates";
import { Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// A component to handle image loading state
const ImageWithLoader = ({ src, alt, className }: { src: string; alt: string; className: string }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="w-full h-full relative">
      {isLoading && <Skeleton className={className} />}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? "hidden" : "block"}`}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

interface CreateCertificateDialogProps {
  selectedTier: TierName;
  onTierChange: (tier: TierName) => void;
  selectedDefaultLayout: DefaultCertificateOption | null;
  onDefaultLayoutChange: (layout: DefaultCertificateOption | null) => void;
  defaultCertificateOptions: DefaultCertificateOption[];
  onCreate: () => void;
  onCancel: () => void;
  isCreating: boolean;
  eventActive: boolean;
  certificateInputRef: RefObject<HTMLInputElement | null>;
  user: { id: string } | null;
}

export function CreateCertificateDialog({
  selectedTier,
  onTierChange,
  selectedDefaultLayout,
  onDefaultLayoutChange,
  defaultCertificateOptions,
  onCreate,
  onCancel,
  isCreating,
  eventActive,
  certificateInputRef,
  user,
}: CreateCertificateDialogProps) {
  const [open, setOpen] = useState(false);

  const handleCancel = () => {
    onCancel();
    if (certificateInputRef.current) {
      certificateInputRef.current.value = "";
    }
    setOpen(false);
  };

  const handleCreate = () => {
    onCreate();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={!user || isCreating || !eventActive}
          className="btn-gradient"
        >
          <Upload className="w-4 h-4 mr-2" />
          Create Certificate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Certificate</DialogTitle>
          <DialogDescription>
            Create a certificate for your event. Select a tier and choose either
            a default layout or upload your own image.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tier Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select Tier</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CERTIFICATE_TIERS.map((tier) => {
                const isSelected = selectedTier === tier.name;
                return (
                  <button
                    key={tier.name}
                    type="button"
                    onClick={() => onTierChange(tier.name)}
                    className={`p-4 border-2 rounded-lg text-left transition-all flex flex-col items-center justify-center gap-2 ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-muted hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="w-12 h-12">
                      <ImageWithLoader
                        src={getTierImageUrlByName(tier.name)}
                        alt={tier.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="font-semibold">{tier.name}</span>
                    <Badge
                      variant="outline"
                      className={getTierBadgeColor(tier.name)}
                    >
                      <span className="text-xs opacity-80 ml-1">
                        {tier.level}
                      </span>
                    </Badge>
                    <p className="text-xs text-muted-foreground text-center">
                      {tier.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layout Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Select Certificate Layout
            </Label>
            <Tabs defaultValue="default" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="default">Default Layout</TabsTrigger>
                <TabsTrigger value="custom">Upload Custom</TabsTrigger>
              </TabsList>
              <TabsContent value="default" className="space-y-3 mt-4">
                {defaultCertificateOptions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No default layouts available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Cert 1-4: 4 columns on md screens */}
                    {defaultCertificateOptions.filter((opt) => opt.index <= 4)
                      .length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {defaultCertificateOptions
                          .filter((opt) => opt.index <= 4)
                          .map((option) => {
                            const isSelected =
                              selectedDefaultLayout?.index === option.index;

                            return (
                              <button
                                key={option.index}
                                type="button"
                                onClick={() => onDefaultLayoutChange(option)}
                                className={`relative border-2 rounded-lg overflow-hidden transition-all aspect-[9/16] ${
                                  isSelected
                                    ? "border-primary ring-2 ring-primary"
                                    : "border-muted hover:border-muted-foreground/50"
                                }`}
                              >
                                <ImageWithLoader
                                  src={option.url}
                                  alt={option.name}
                                  className="w-full h-full object-cover"
                                />
                                {isSelected && (
                                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                                    Selected
                                  </div>
                                )}
                                <div className="absolute bottom-2 left-2 right-2 bg-background/90 px-2 py-1 rounded text-xs text-center">
                                  {option.name}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                    {/* Cert 5-8: 2 columns */}
                    {defaultCertificateOptions.filter(
                      (opt) => opt.index >= 5 && opt.index <= 8
                    ).length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {defaultCertificateOptions
                          .filter((opt) => opt.index >= 5 && opt.index <= 8)
                          .map((option) => {
                            const isSelected =
                              selectedDefaultLayout?.index === option.index;

                            return (
                              <button
                                key={option.index}
                                type="button"
                                onClick={() => onDefaultLayoutChange(option)}
                                className={`relative border-2 rounded-lg overflow-hidden transition-all aspect-[16/9] ${
                                  isSelected
                                    ? "border-primary ring-2 ring-primary"
                                    : "border-muted hover:border-muted-foreground/50"
                                }`}
                              >
                                <ImageWithLoader
                                  src={option.url}
                                  alt={option.name}
                                  className="w-full h-full object-cover"
                                />
                                {isSelected && (
                                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                                    Selected
                                  </div>
                                )}
                                <div className="absolute bottom-2 left-2 right-2 bg-background/90 px-2 py-1 rounded text-xs text-center">
                                  {option.name}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="custom" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Input
                    ref={certificateInputRef}
                    type="file"
                    accept="image/*"
                    onChange={() => {
                      // Clear default selection when custom file is selected
                      onDefaultLayoutChange(null);
                    }}
                    disabled={isCreating}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    We suggest using 1920x1080 or 1080x1920 pixel layouts for
                    best results.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !selectedTier || !eventActive}
            className="btn-gradient"
          >
            {isCreating ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Creating...
              </>
            ) : (
              "Create Certificate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
