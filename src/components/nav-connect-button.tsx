import {
  useCurrentWallet,
  useWallets,
  useConnectWallet,
  useDisconnectWallet,
} from "@mysten/dapp-kit";
import { Button, buttonVariants } from "./ui/button";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface NavConnectButtonProps {
  className?: string;
}

export function NavConnectButton({ className }: NavConnectButtonProps) {
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
          <Button
            variant="outline"
            className={cn(buttonVariants({ variant: "outline" }), className)}
          >
            <Wallet className="size-4" />
            {formatAddress(currentWallet.accounts[0]?.address || "")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
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
        <Button
          variant="outline"
          className={cn(buttonVariants({ variant: "outline" }), className)}
        >
          <Wallet className="size-4" />
          Connect Wallet
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
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
