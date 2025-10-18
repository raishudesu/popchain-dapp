import { useState } from "react";
import { Button } from "../ui/button";

const Cta = () => {
  const [email, setEmail] = useState("");

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black to-gray-950">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
          Ready to Mint Your Moments?
        </h2>
        <p className="text-xl text-gray-400 mb-8">
          Join organizers and attendees building verifiable event credentials
          on-chain
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-6 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition"
          />
          <Button className="bg-gradient-to-r from-purple-400 to-pink-600 text-white hover:from-purple-500 hover:to-pink-700 font-semibold">
            Get Early Access
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          No credit card required. Start free today.
        </p>
      </div>
    </section>
  );
};

export default Cta;
