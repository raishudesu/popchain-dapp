import SpotlightCard from "../../components/SpotlightCard";
import { tiers } from "./data";

const Tiers = () => {
  const spotlightColors: Array<`rgba(${number}, ${number}, ${number}, ${number})`> =
    [
      "rgba(139, 92, 246, 0.2)", // Purple for PopPass
      "rgba(59, 130, 246, 0.2)", // Blue for PopBadge
      "rgba(236, 72, 153, 0.2)", // Pink for PopMedal
      "rgba(251, 191, 36, 0.2)", // Gold for PopTrophy
    ];

  const tierBadgeColors = [
    "bg-purple-500/20 text-purple-400",
    "bg-blue-500/20 text-blue-400",
    "bg-pink-500/20 text-pink-400",
    "bg-yellow-500/20 text-yellow-400",
  ];

  const tierImages = [
    "/tiers/pop_pass.png",
    "/tiers/pop_badge.png",
    "/tiers/pop_medal.png",
    "/tiers/pop_trophy.png",
  ];

  return (
    <section id="tiers" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Tiered NFT System
          </h2>
          <p className="text-xl text-gray-400">
            Different tiers for different achievements
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier, idx) => {
            return (
              <SpotlightCard
                key={idx}
                className="custom-spotlight-card shadow-lg"
                spotlightColor={spotlightColors[idx]}
              >
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-4 group-hover:scale-110 transition inline-block">
                    <img
                      src={tierImages[idx]}
                      alt={tier.title}
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                  <div
                    className={`inline-block px-3 py-1 mb-3 rounded-full ${tierBadgeColors[idx]} text-xs font-semibold`}
                  >
                    {tier.tier}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{tier.title}</h3>
                  <p className="text-gray-400">{tier.description}</p>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Tiers;
