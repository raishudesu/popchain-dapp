import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet } from "react-router";
import { OrganizerSidebar } from "./organizer-sidebar";

export default function OrganizerLayout() {
  return (
    <SidebarProvider>
      <OrganizerSidebar />
      <main>
        <SidebarTrigger />
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
