import { useState } from "react";
import { ModeToggle } from "./mode-toggle";
import { Button, buttonVariants } from "./ui/button";
import { ConnectButton } from "@mysten/dapp-kit";
import { MobileMenuSheet } from "./mobile-menu-sheet";
import { cn } from "@/lib/utils";

const Nav = () => {
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/#home", label: "Home" },
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it Works" },
    { href: "#benefits", label: "For Organizers & Attendees" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center justify-center gap-2">
          <img
            src={"/logos/popchain_logo.png"}
            alt="popchain-logo"
            className="w-12 h-12 object-contain"
          />
          <span className="font-bold text-lg text-gray-50 italic">
            PopChain
          </span>
        </a>
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition text-gray-50 font-medium hover:underline"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="hidden lg:flex items-center gap-2 ">
          <ModeToggle />
          <a href="/login">
            <Button className="btn-gradient">Get Started</Button>
          </a>
          <ConnectButton
            className={cn(buttonVariants({ variant: "outline" }))}
          />
        </div>
        <div className="lg:hidden">
          <MobileMenuSheet
            navLinks={navLinks}
            open={open}
            onOpenChange={setOpen}
          />
        </div>
      </div>
    </nav>
  );
};

export default Nav;
