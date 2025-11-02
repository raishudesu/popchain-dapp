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
import { createDepositTransaction } from "@/services/wallet";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { ArrowDownCircle } from "lucide-react";

const depositSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: "Amount must be a positive number" }
    ),
});

type DepositFormData = z.infer<typeof depositSchema>;

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountAddress: string;
  walletBalance: string;
  onDepositSuccess?: () => void;
}

export function DepositDialog({
  open,
  onOpenChange,
  accountAddress,
  walletBalance,
  onDepositSuccess,
}: DepositDialogProps) {
  const [isDepositing, setIsDepositing] = useState(false);
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const form = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: "",
    },
  });

  const handleDeposit = async (data: DepositFormData) => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsDepositing(true);
    try {
      const amountInMist = BigInt(
        Math.floor(parseFloat(data.amount) * 1_000_000_000)
      ).toString();

      // Get coins from wallet
      const coins = await suiClient.getCoins({
        owner: account.address,
        coinType: "0x2::sui::SUI",
      });

      if (coins.data.length === 0) {
        toast.error("No SUI coins available in wallet");
        return;
      }

      // Calculate total balance
      const totalBalance = coins.data.reduce(
        (sum, coin) => sum + BigInt(coin.balance),
        BigInt(0)
      );

      if (totalBalance < BigInt(amountInMist)) {
        toast.error("Insufficient balance in wallet");
        return;
      }

      // Gas reserve (approximately 0.1 SUI should be enough for most transactions)
      const gasReserve = BigInt(100_000_000); // 0.1 SUI

      // Verify we have enough for deposit + gas
      if (totalBalance < BigInt(amountInMist) + gasReserve) {
        toast.error(
          "Insufficient balance. Need extra SUI for transaction fees."
        );
        return;
      }

      // Verify we have enough for deposit + gas
      // The transaction will split from the gas coin, so we need enough total balance
      if (totalBalance < BigInt(amountInMist) + gasReserve) {
        toast.error(
          "Insufficient balance. Need extra SUI for transaction fees."
        );
        return;
      }

      // Create transaction - splits from gas coin automatically
      // The remaining gas coin will be used for gas fees
      const tx = createDepositTransaction(accountAddress, amountInMist);

      // Execute transaction
      const result = await signAndExecute({
        transaction: tx,
      });

      // Wait for transaction
      await suiClient.waitForTransaction({
        digest: result.digest,
      });

      toast.success("Deposit successful!");
      form.reset();
      onOpenChange(false);
      onDepositSuccess?.();
    } catch (error) {
      console.error("Deposit error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to deposit funds"
      );
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="flex items-center gap-2 btn-gradient"
          variant="secondary"
        >
          <ArrowDownCircle className="h-4 w-4" />
          Deposit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Transfer SUI from your wallet to your PopChain account.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleDeposit)}
            className="space-y-4"
          >
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground mb-1">
                Wallet Balance
              </p>
              <p className="text-lg font-semibold">
                {parseFloat(walletBalance).toFixed(4)} SUI
              </p>
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (SUI)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.000000001"
                      placeholder="0.00"
                      {...field}
                      disabled={isDepositing}
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
                disabled={isDepositing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isDepositing}>
                {isDepositing ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Depositing...
                  </>
                ) : (
                  "Deposit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
