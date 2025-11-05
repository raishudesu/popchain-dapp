import {
  ChevronUp,
  LayoutDashboard,
  LogOut,
  Settings,
  User2,
  Users,
  UserCheck,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomConnectButton } from "@/components/custom-connect-button";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "react-router";
import { ModeToggle } from "@/components/mode-toggle";

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const { signOut, user, isOrganizer, isAttendee } = useAuth();

  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    navigate("/login");
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <img
              src={"/logos/popchain_logo.png"}
              alt="popchain-logo"
              className="w-12 h-12 object-contain"
            />
            <span className="font-bold text-lg italic">PopChain</span>
          </div>
          <SidebarGroupLabel>PopChain Admin</SidebarGroupLabel>
        </SidebarHeader>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {(isOrganizer || isAttendee) && (
          <SidebarGroup>
            <SidebarGroupLabel>Other Dashboards</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isOrganizer && (
                  <SidebarMenuItem key="organizer-dashboard">
                    <SidebarMenuButton asChild>
                      <a href="/organizer/dashboard">
                        <Users />
                        <span>Organizer Dashboard</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {isAttendee && (
                  <SidebarMenuItem key="attendee-dashboard">
                    <SidebarMenuButton asChild>
                      <a href="/attendee/dashboard">
                        <UserCheck />
                        <span>Attendee Dashboard</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <ModeToggle />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarMenu>
          {/* Wallet Connect Button */}
          <SidebarMenuItem className="w-full mb-2">
            <CustomConnectButton />
          </SidebarMenuItem>

          {/* User Menu */}
          <SidebarMenuItem className="w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 /> <span className="truncate">{user?.email}</span>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
