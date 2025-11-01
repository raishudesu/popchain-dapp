import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const Cta = () => {
  const [email, setEmail] = useState("");

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
          Ready to Mint Your Moments?
        </h2>
        <p className="text-xl text-gray-400 mb-8">
          Join organizers and attendees building verifiable event credentials
          on-chain
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full max-w-sm"
          />
          <Button className="btn-gradient">Get Early Access</Button>
        </div>
      </div>
    </section>
  );
};

export default Cta;
