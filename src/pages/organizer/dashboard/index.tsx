import { DashboardHeader } from "../components/dashboard-header";
import { EventCards } from "../components/event-cards";

const OrganizerDashboard = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader />
      <div className="flex-1 p-8">
        <EventCards />
      </div>
    </div>
  );
};

export default OrganizerDashboard;
