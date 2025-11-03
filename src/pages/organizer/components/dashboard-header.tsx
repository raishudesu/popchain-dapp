import { useState } from "react";
import { Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  useCurrentAccount,
  useSuiClient,
  useCurrentWallet,
} from "@mysten/dapp-kit";
import { useAuth } from "@/contexts/auth-context";
import { getPopChainAccountBalance, getWalletBalance } from "@/services/wallet";
import { DepositDialog } from "./deposit-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardHeader() {
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const { profile } = useAuth();
  const account = useCurrentAccount();
  const { isConnected } = useCurrentWallet();
  const suiClient = useSuiClient();

  // Query PopChain account balance
  const {
    data: popChainBalance,
    isLoading: isLoadingPopChain,
    refetch: refetchPopChain,
  } = useQuery({
    queryKey: ["popchain-balance", profile?.popchain_account_address],
    queryFn: async () => {
      if (!profile?.popchain_account_address) return null;
      return getPopChainAccountBalance(
        profile.popchain_account_address,
        suiClient
      );
    },
    enabled: !!profile?.popchain_account_address,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Query wallet balance
  const {
    data: walletBalanceData,
    isLoading: isLoadingWallet,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ["wallet-balance", account?.address],
    queryFn: async () => {
      if (!account?.address) return null;
      return getWalletBalance(account.address, suiClient);
    },
    enabled: !!account?.address && isConnected,
    refetchInterval: 10000,
  });

  const popChainSui = popChainBalance?.sui || "0";
  const popChainMist = popChainBalance?.mist || "0";
  const walletSui = walletBalanceData?.sui || "0";
  const walletMist = walletBalanceData?.mist || "0";

  const handleDepositSuccess = () => {
    refetchPopChain();
    refetchWallet();
  };

  return (
    <>
      <div className="bg-gradient-to-r from-accent to-accent/80 px-8 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-accent-foreground/80 text-sm font-medium mb-4">
              PopChain Account Balance
            </p>
            {isLoadingPopChain ? (
              <Skeleton className="h-12 w-48 mb-2" />
            ) : (
              <div className="space-y-1 mb-4">
                <div className="flex items-baseline gap-2">
                  <h1 className="text-4xl font-bold text-accent-foreground">
                    {parseFloat(popChainSui).toFixed(4)}
                  </h1>
                  <span className="text-accent-foreground/60 text-lg">SUI</span>
                </div>
                <p className="text-accent-foreground/60 text-sm">
                  {popChainMist} MIST
                </p>
                <div className="mt-4">
                  {isConnected &&
                    account &&
                    profile?.popchain_account_address && (
                      <DepositDialog
                        open={depositDialogOpen}
                        onOpenChange={setDepositDialogOpen}
                        accountAddress={profile.popchain_account_address}
                        walletBalance={walletSui}
                        onDepositSuccess={handleDepositSuccess}
                      />
                    )}
                </div>
              </div>
            )}

            {isConnected && account && (
              <div className="mt-4 pt-4 border-t border-accent-foreground/20">
                <p className="text-accent-foreground/80 text-sm font-medium mb-2">
                  Wallet Balance
                </p>
                {isLoadingWallet ? (
                  <Skeleton className="h-8 w-40" />
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-semibold text-accent-foreground">
                        {parseFloat(walletSui).toFixed(4)}
                      </p>
                      <span className="text-accent-foreground/60">SUI</span>
                    </div>
                    <p className="text-accent-foreground/60 text-xs">
                      {walletMist} MIST
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="w-14 h-14 bg-accent-foreground/10 rounded-xl flex items-center justify-center">
              <Wallet className="w-7 h-7 text-accent-foreground" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
