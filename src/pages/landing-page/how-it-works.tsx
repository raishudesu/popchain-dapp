import SpotlightCard from "../../components/SpotlightCard";
import { howItWorks } from "./data";

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold  mb-4">How It Works</h2>
          <p className="text-xl text-gray-400">
            Simple, transparent, and secure
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {howItWorks.map((item, idx) => (
            <SpotlightCard
              className="custom-spotlight-card"
              spotlightColor="rgba(236, 72, 153, 0.2)"
            >
              <div key={idx} className="relative text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
