import {
  useCurrentWallet,
  useWallets,
  useConnectWallet,
  useDisconnectWallet,
} from "@mysten/dapp-kit";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CustomConnectButtonProps {
  className?: string;
}

export function CustomConnectButton({ className }: CustomConnectButtonProps) {
  const { currentWallet, isConnected } = useCurrentWallet();
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();

  const handleConnect = (wallet: (typeof wallets)[0]) => {
    connect(
      { wallet },
      {
        onSuccess: () => {},
      }
    );
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isConnected && currentWallet) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton className={cn(className)}>
            <Wallet className="size-4" />
            <span className="flex-1 text-left">
              {formatAddress(currentWallet.accounts[0]?.address || "")}
            </span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuItem onClick={handleDisconnect}>
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className={cn(className)}>
          <Wallet className="size-4" />
          <span className="flex-1 text-left">Connect Wallet</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        className="w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {wallets.map((wallet) => (
          <DropdownMenuItem
            key={wallet.name}
            onClick={() => handleConnect(wallet)}
          >
            {wallet.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
