import { ModeToggle } from "./mode-toggle";
import { Button, buttonVariants } from "./ui/button";
import { ConnectButton } from "@mysten/dapp-kit";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

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
            <a href="/login" onClick={() => onOpenChange(false)}>
              <Button className="btn-gradient w-full">Get Started</Button>
            </a>
            <ConnectButton
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
