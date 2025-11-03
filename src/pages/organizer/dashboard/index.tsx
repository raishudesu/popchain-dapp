import { DashboardHeader } from "../components/dashboard-header";
import Events from "../components/events";

const OrganizerDashboard = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background w-full">
      <DashboardHeader />
      <div className="flex-1 p-8">
        <Events />
      </div>
    </div>
  );
};

export default OrganizerDashboard;
