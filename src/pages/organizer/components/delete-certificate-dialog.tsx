import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Certificate } from "@/types/database";

interface DeleteCertificateDialogProps {
  certificate: Certificate;
  onConfirm: (certificateId: string, imageUrl: string) => void;
  isDeleting: boolean;
  disabled?: boolean;
}

export function DeleteCertificateDialog({
  certificate,
  onConfirm,
  isDeleting,
  disabled = false,
}: DeleteCertificateDialogProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm(certificate.id, certificate.image_url);
    setOpen(false);
  };

  const handleOpen = () => {
    if (disabled) {
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleOpen}
        disabled={isDeleting || disabled}
        title={disabled ? "Cannot delete certificate: Event has ended" : undefined}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Certificate
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "
              {certificate.name || "this certificate"}"? This action cannot be
              undone and will permanently remove the certificate from your
              event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
