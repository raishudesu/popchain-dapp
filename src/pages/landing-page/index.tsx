import Tiers from "@/pages/landing-page/tiers";
import HowItWorks from "@/pages/landing-page/how-it-works";
import Benefits from "@/pages/landing-page/benefits";
import Cta from "@/pages/landing-page/cta";
import Hero from "./hero";
import Features from "./features";
import Ranking from "./ranking";

const LandingPage = () => {
  return (
    <>
      <Hero />
      <Features />
      <Tiers />
      <HowItWorks />
      <Ranking />
      <Benefits />
      <Cta />
    </>
  );
};

export default LandingPage;
