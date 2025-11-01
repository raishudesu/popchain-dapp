import { Sparkles } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { Button, buttonVariants } from "./ui/button";
import { ConnectButton } from "@mysten/dapp-kit";
import { cn } from "@/lib/utils";

const Nav = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">PopChain</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-gray-300 hover:text-white transition"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-gray-300 hover:text-white transition"
          >
            How it Works
          </a>
          <a
            href="#benefits"
            className="text-gray-300 hover:text-white transition"
          >
            For Organizers & Attendees
          </a>
        </div>
        <div className="flex items-center gap-2 ">
          <ModeToggle />
          <Button>Get Started</Button>
          <ConnectButton
            className={cn(buttonVariants({ variant: "outline" }))}
          />
        </div>
      </div>
    </nav>
  );
};

export default Nav;
