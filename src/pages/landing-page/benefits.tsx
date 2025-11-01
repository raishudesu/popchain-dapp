import { CheckCircle2 } from "lucide-react";
import certImage from "@/assets/certificates/cert.png";

const Benefits = () => {
  return (
    <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Why PopChain?
            </h2>
            <ul className="space-y-4">
              {[
                "Verifiable proof of attendance on blockchain",
                "Instant NFT minting at event conclusion",
                "Collectible tiered NFT certificates for achievements & recognition",
                "Portable credentials across all platforms",
                "Fraud-proof and tamper-resistant",
                "Perfect for conferences, seminars & educational events",
              ].map((benefit, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 text-lg text-muted-foreground"
                >
                  <CheckCircle2 className="w-6 h-6 text-purple-400 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <img
            src={certImage}
            alt="certificate-sample/"
            className="rounded-xl shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
};

export default Benefits;
