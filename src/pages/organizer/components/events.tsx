import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Users, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateEventDialog } from "./create-event-dialog";
import { fetchOrganizerEvents } from "@/services/events";
import { useAuth } from "@/contexts/auth-context";
import type { Event } from "@/types/database";

type EventWithWhitelist = Event & { whitelistedCount: number };

export default function Events() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Fetch events from Supabase with whitelist counts
  const {
    data: eventsWithCount = [],
    isLoading: eventsLoading,
    refetch,
  } = useQuery<EventWithWhitelist[]>({
    queryKey: ["events", user?.id],
    queryFn: () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return fetchOrganizerEvents(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">My Events</h2>
          <p className="text-muted-foreground">
            Manage your events and view their details
          </p>
        </div>
        <Button className="btn-gradient" onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="w-4 h-4" />
          Create Event
        </Button>
      </div>

      <CreateEventDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onEventCreated={() => {
          // Refresh events list
          refetch();
        }}
      />

      {authLoading || eventsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : eventsWithCount.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No events found.</p>
          <p className="text-sm text-muted-foreground">
            Create your first event to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventsWithCount.map((event) => (
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
                  {event.active && (
                    <Badge
                      variant="secondary"
                      className="bg-green-500/20 text-green-400 border-green-500/50"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
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

                <Button
                  variant="secondary"
                  className="w-full btn-gradient"
                  onClick={() => navigate(`/organizer/event/${event.event_id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
