import { useState } from "react";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getTreasuryBalance,
  getTreasuryOwner,
  getRecentTreasuryEvents,
  createWithdrawTransaction,
} from "@/services/admin";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Wallet, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { popchainErrorDecoder } from "@/utils/errors";

const withdrawSchema = z.object({
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

type WithdrawFormData = z.infer<typeof withdrawSchema>;

const ITEMS_PER_PAGE = 10;

const AdminDashboard = () => {
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const form = useForm<WithdrawFormData>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      amount: "",
    },
  });

  // Fetch treasury balance
  const {
    data: treasuryBalance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ["treasury-balance"],
    queryFn: () => getTreasuryBalance(suiClient),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch treasury owner
  const {
    data: treasuryOwner,
    isLoading: ownerLoading,
    refetch: refetchOwner,
  } = useQuery({
    queryKey: ["treasury-owner"],
    queryFn: () => getTreasuryOwner(suiClient),
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch recent transactions (fetch more for pagination)
  const {
    data: recentTransactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["treasury-transactions"],
    queryFn: () => getRecentTreasuryEvents(suiClient, 100), // Fetch more for pagination
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Calculate pagination
  const totalPages = Math.ceil(recentTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = recentTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when transactions change
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleWithdraw = async (data: WithdrawFormData) => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsWithdrawing(true);
    try {
      // Convert SUI to MIST (1 SUI = 1_000_000_000 MIST)
      const amountInMist = BigInt(
        Math.floor(parseFloat(data.amount) * 1_000_000_000)
      ).toString();

      // Check if treasury has enough balance
      if (!treasuryBalance) {
        toast.error("Could not fetch treasury balance");
        return;
      }

      const treasuryBalanceMist = BigInt(treasuryBalance.mist);
      const withdrawAmountMist = BigInt(amountInMist);

      if (treasuryBalanceMist < withdrawAmountMist) {
        toast.error("Insufficient treasury balance");
        return;
      }

      // Create transaction
      const tx = createWithdrawTransaction(amountInMist);

      // Execute transaction
      const result = await signAndExecute({
        transaction: tx,
      });

      // Wait for transaction
      await suiClient.waitForTransaction({
        digest: result.digest,
      });

      toast.success("Funds withdrawn successfully!");
      form.reset();
      setIsWithdrawDialogOpen(false);

      // Refetch data
      refetchBalance();
      refetchTransactions();
    } catch (error) {
      console.error("Withdraw error:", error);
      const parsedError = popchainErrorDecoder.parseError(error);
      toast.error(parsedError.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleRefresh = () => {
    refetchBalance();
    refetchOwner();
    refetchTransactions();
    toast.success("Data refreshed");
  };

  const formatEventType = (eventType: string): string => {
    // Admin module events
    if (eventType.includes("PlatformInitialized")) {
      return "Platform Initialized";
    }
    if (eventType.includes("FeesDeposited")) {
      return "Fees Deposited";
    }
    if (eventType.includes("FundsWithdrawn")) {
      return "Funds Withdrawn";
    }
    // Event module events
    if (eventType.includes("EventCreated")) {
      return "Event Created";
    }
    // Certificate module events
    if (eventType.includes("CertificateMinted")) {
      return "Certificate Minted";
    }
    if (eventType.includes("CertificateTransferred")) {
      return "Certificate Transferred";
    }
    // User module events
    if (eventType.includes("AccountCreated")) {
      return "Account Created";
    }
    if (eventType.includes("WalletLinked")) {
      return "Wallet Linked";
    }
    // Wallet module events
    if (eventType.includes("Deposited")) {
      return "Deposited";
    }
    if (eventType.includes("Withdrawn")) {
      return "Withdrawn";
    }
    // Generic fallback - extract module and event name
    const parts = eventType.split("::");
    if (parts.length >= 3) {
      return parts[parts.length - 1].replace(/([A-Z])/g, " $1").trim();
    }
    return eventType;
  };

  // const formatAmount = (amount: string | undefined): string => {
  //   if (!amount) return "N/A";
  //   const mist = BigInt(amount);
  //   const sui = Number(mist) / 1_000_000_000;
  //   return `${sui.toFixed(4)} SUI`;
  // };

  const formatTimestamp = (timestamp: number | null): string => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatAddress = (address: string | undefined): string => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-6 p-8 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            PopChain Admin Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manage platform treasury and view recent transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={balanceLoading || ownerLoading || transactionsLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            className="btn-gradient"
            onClick={() => setIsWithdrawDialogOpen(true)}
            disabled={!account || !treasuryBalance || balanceLoading}
          >
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Withdraw Funds
          </Button>
        </div>
      </div>

      {/* Treasury Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Treasury Balance
            </CardTitle>
            <CardDescription>
              Current balance in PlatformTreasury
            </CardDescription>
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading...
                </span>
              </div>
            ) : treasuryBalance ? (
              <div>
                <p className="text-3xl font-bold">
                  {parseFloat(treasuryBalance.sui).toFixed(6)} SUI
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {treasuryBalance.mist} MIST
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Failed to load balance
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Treasury Owner</CardTitle>
            <CardDescription>Platform owner address</CardDescription>
          </CardHeader>
          <CardContent>
            {ownerLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading...
                </span>
              </div>
            ) : treasuryOwner ? (
              <div>
                <p className="text-sm font-mono break-all">{treasuryOwner}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only the owner can withdraw funds
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Failed to load owner address
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Latest PlatformTreasury events and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((tx, index) => (
                  <TableRow key={`${tx.digest}-${index}`}>
                    <TableCell className="font-medium">
                      {formatEventType(tx.type)}
                    </TableCell>
                    <TableCell>{formatTimestamp(tx.timestamp)}</TableCell>
                    <TableCell>
                      <a
                        href={`https://suiscan.xyz/testnet/tx/${tx.digest}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm font-mono"
                      >
                        {formatAddress(tx.digest)}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {recentTransactions.length > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, recentTransactions.length)} of{" "}
                {recentTransactions.length} transactions
              </div>
              <Pagination>
                <PaginationContent className="ml-auto">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage((prev) => Math.max(1, prev - 1));
                      }}
                      className={
                        currentPage === 1 || transactionsLoading
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (totalPages <= 7) return true;
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const prevPage = array[index - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                              isActive={currentPage === page}
                              className={
                                transactionsLoading
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </React.Fragment>
                      );
                    })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage((prev) =>
                          Math.min(totalPages, prev + 1)
                        );
                      }}
                      className={
                        currentPage === totalPages || transactionsLoading
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog
        open={isWithdrawDialogOpen}
        onOpenChange={setIsWithdrawDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Withdraw funds from PlatformTreasury to the owner address. Only
              the treasury owner can perform this action.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleWithdraw)}
              className="space-y-4"
            >
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground mb-1">
                  Treasury Balance
                </p>
                <p className="text-lg font-semibold">
                  {treasuryBalance
                    ? `${parseFloat(treasuryBalance.sui).toFixed(4)} SUI`
                    : "Loading..."}
                </p>
              </div>

              {treasuryOwner && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground mb-1">
                    Withdrawal Address
                  </p>
                  <p className="text-sm font-mono break-all">{treasuryOwner}</p>
                </div>
              )}

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
                        disabled={isWithdrawing}
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
                  onClick={() => setIsWithdrawDialogOpen(false)}
                  disabled={isWithdrawing}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isWithdrawing}
                  className="btn-gradient"
                >
                  {isWithdrawing ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Withdrawing...
                    </>
                  ) : (
                    "Withdraw"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
