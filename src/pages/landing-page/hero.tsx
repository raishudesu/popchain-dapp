import Iridescence from "@/components/Iridescence";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Shield, Zap } from "lucide-react";

const Hero = () => {
  return (
    <section
      id="home"
      className="relative h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Iridescence
          color={[0.8, 0.4, 1]}
          speed={0.8}
          amplitude={0.15}
          mouseReact={true}
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/40 to-black/80 z-10" />

      {/* Content */}
      <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-6 inline-block">
          <span className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm text-white backdrop-blur-sm">
            ✨ Mint Your Moments On-Chain
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight text-balance">
          Turn Every Event Into an NFT Certificate
        </h1>

        <p className="text-xl sm:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto text-balance">
          PopChain lets you prove you were there. Scan, mint, collect. Your
          attendance, secured forever on the blockchain.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a href="/register">
            <Button className="btn-gradient">
              Launch App <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </a>
          <a href="#features">
            <Button variant="outline">Learn More</Button>
          </a>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-purple-400" />
            <span>Instant NFT Minting</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span>Immutable Proof</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <span>QR Code Scanning</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
