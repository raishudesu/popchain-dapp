import {
  ChevronUp,
  LayoutDashboard,
  LogOut,
  Settings,
  User2,
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

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/attendee/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

export function AttendeeSidebar() {
  const { signOut, user } = useAuth();

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
            <span className="font-bold text-lg text-gray-50 italic">
              PopChain
            </span>
          </div>
          <SidebarGroupLabel>Attendee Dashboard</SidebarGroupLabel>
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
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {/* Wallet Connect Button */}
          <SidebarMenuItem className="w-full mb-2">
            <CustomConnectButton />
          </SidebarMenuItem>
          <SidebarMenuItem className="w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 /> {user?.email}
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuItem
                  onClick={() => {
                    signOut();
                  }}
                >
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
