import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface Event {
  id: string;
  name: string;
  description: string;
  whitelistedCount: number;
}

export function EventCards() {
  // Mock events - replace with actual blockchain data fetching
  const events: Event[] = [
    {
      id: "1",
      name: "NFT Genesis Drop",
      description:
        "Limited edition NFT collection launch with exclusive benefits for early participants.",
      whitelistedCount: 1234,
    },
    {
      id: "2",
      name: "DeFi Liquidity Pool",
      description:
        "New decentralized finance pool opening with 45% APY for liquidity providers.",
      whitelistedCount: 856,
    },
    {
      id: "3",
      name: "Token Staking Event",
      description:
        "Stake your tokens and earn rewards in our new blockchain-based staking program.",
      whitelistedCount: 2156,
    },
    {
      id: "4",
      name: "Web3 Community Summit",
      description:
        "Virtual conference featuring top speakers in blockchain, crypto, and NFT ecosystems.",
      whitelistedCount: 5432,
    },
    {
      id: "5",
      name: "Smart Contract Audit",
      description:
        "Security audit event for blockchain projects with professional vulnerability assessment.",
      whitelistedCount: 342,
    },
    {
      id: "6",
      name: "DAO Governance Vote",
      description:
        "Participate in decentralized autonomous organization governance decisions.",
      whitelistedCount: 3789,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">My Events</h2>
        <p className="text-muted-foreground">
          Manage your events and view their details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Card
            key={event.id}
            className="hover:shadow-lg transition-shadow duration-300 cursor-pointer border-border hover:border-accent/50"
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg text-foreground">
                    {event.name}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {event.description}
              </p>

              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Users className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Whitelisted Accounts
                  </p>
                  <p className="font-semibold text-foreground">
                    {event.whitelistedCount.toLocaleString()}
                  </p>
                </div>
              </div>

              <Badge
                variant="secondary"
                className="w-full justify-center py-2 btn-gradient"
              >
                View Details
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
