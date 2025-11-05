import { Copy, Check, QrCode } from "lucide-react";
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
import { toast } from "sonner";
import QRCodeComponent from "@/components/qr-code";
import type { Certificate } from "@/types/database";

interface QRCodeDialogProps {
  certificate: Certificate;
}

export function QRCodeDialog({ certificate }: QRCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = async () => {
    const link = `${
      import.meta.env.VITE_APP_URL || window.location.origin
    }/scan-qr/${certificate.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCopiedLink(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-background/90 hover:bg-background"
        >
          <QrCode className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Certificate QR Code</DialogTitle>
          <DialogDescription>
            Scan this QR code to view the certificate. The QR code contains the
            certificate ID: {certificate.id}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <QRCodeComponent
            value={`${
              import.meta.env.VITE_APP_URL || window.location.origin
            }/scan-qr/${certificate.id}`}
            size={300}
            showDownloadButton={true}
            downloadFileName={`certificate-${certificate.id}-qr-code`}
            skipLogoOnDownload={false}
            logoUrl={certificate.tier_image_url || undefined}
          />
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold">
              {certificate.name || "Certificate"}
            </p>
            <p className="text-xs text-muted-foreground">
              {certificate.tier_name} • {certificate.tier_level}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
