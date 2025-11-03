import { LogOut } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import { NavConnectButton } from "./nav-connect-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface NavLink {
  href: string;
  label: string;
}

interface MobileMenuSheetProps {
  navLinks: NavLink[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenuSheet({
  navLinks,
  open,
  onOpenChange,
}: MobileMenuSheetProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to sign out:", error);
      // Fallback: redirect manually if signOut fails
      window.location.href = "/login";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="lg">
          <Menu className="h-12 w-12 text-gray-50" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Navigate</SheetTitle>
        </SheetHeader>
        <div className="grid flex-1 auto-rows-min gap-6 px-4 text-muted-foreground">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => onOpenChange(false)}
              className="font-medium hover:underline py-2"
            >
              {link.label}
            </a>
          ))}
          <div className="flex items-center gap-2 pt-4 border-t">
            <ModeToggle />
          </div>
          <div className="flex flex-col gap-2">
            {user ? (
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <a href="/login" onClick={() => onOpenChange(false)}>
                <Button className="btn-gradient w-full">Get Started</Button>
              </a>
            )}
            <NavConnectButton className="w-full" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
