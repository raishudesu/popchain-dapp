import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet } from "react-router";
import { AttendeeSidebar } from "./attendee-sidebar";

export default function AttendeeLayout() {
  return (
    <SidebarProvider>
      <AttendeeSidebar />
      <main className="w-full">
        <SidebarTrigger />
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
