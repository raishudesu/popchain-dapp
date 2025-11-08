import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Trophy, Medal, Award, Hash, Copy, Check } from "lucide-react";
import { getAccountRankings } from "@/services/ranking";
import { toast } from "sonner";
import { useState } from "react";

const Ranking = () => {
  const suiClient = useSuiClient();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const {
    data: rankings,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["account-rankings"],
    queryFn: () => getAccountRankings(suiClient, 10),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success("Address copied to clipboard!");
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedAddress(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
      toast.error("Failed to copy address");
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <Award className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case 2:
        return "bg-gray-400/10 text-gray-700 dark:text-gray-400 border-gray-400/20";
      case 3:
        return "bg-amber-600/10 text-amber-700 dark:text-amber-600 border-amber-600/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <section id="ranking" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Top PopChain Accounts
          </h2>
          <p className="text-muted-foreground text-lg">
            See who has collected the most certificates across all tiers
          </p>
        </div>

        <Card>
          <CardHeader>
            {/* <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Certificate Rankings
            </CardTitle> */}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="w-8 h-8" />
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Failed to load rankings. Please try again later.
                </p>
              </div>
            ) : !rankings || rankings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No rankings available yet.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Account Address</TableHead>
                    <TableHead className="text-center">PopPass</TableHead>
                    <TableHead className="text-center">PopBadge</TableHead>
                    <TableHead className="text-center">PopMedal</TableHead>
                    <TableHead className="text-center">PopTrophy</TableHead>
                    <TableHead className="text-right font-semibold">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.map((account, index) => {
                    const rank = index + 1;
                    return (
                      <TableRow key={account.accountAddress}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRankIcon(rank)}
                            <span className="font-semibold">{rank}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-sm">
                              {formatAddress(account.accountAddress)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                handleCopyAddress(account.accountAddress)
                              }
                              title="Copy address"
                            >
                              {copiedAddress === account.accountAddress ? (
                                <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                          >
                            {account.popPass}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                          >
                            {account.popBadge}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                          >
                            {account.popMedal}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
                          >
                            {account.popTrophy}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`font-semibold ${getRankBadgeColor(
                              rank
                            )}`}
                          >
                            {account.total}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Ranking;
