import { AlertTriangle } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";

interface CloseEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isClosing: boolean;
}

export function CloseEventDialog({
  open,
  onOpenChange,
  onConfirm,
  isClosing,
}: CloseEventDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Close Event
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to close this event? Once closed, no
            new certificates can be minted for this event. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClosing}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isClosing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isClosing ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Closing...
              </>
            ) : (
              "Close Event"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

