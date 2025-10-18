import { Award, CheckCircle2 } from "lucide-react";

const Benefits = () => {
  return (
    <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Why PopChain?
            </h2>
            <ul className="space-y-4">
              {[
                "Verifiable proof of attendance on blockchain",
                "Instant NFT minting at event conclusion",
                "Collectible badges for achievements & side quests",
                "Portable credentials across all platforms",
                "Fraud-proof and tamper-resistant",
                "Perfect for conferences, seminars & educational events",
              ].map((benefit, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 text-lg text-gray-300"
                >
                  <CheckCircle2 className="w-6 h-6 text-purple-400 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative h-96 rounded-xl overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-600/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Award className="w-24 h-24 text-purple-400/30 mx-auto mb-4" />
                <p className="text-gray-400">Your moments, minted forever</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
