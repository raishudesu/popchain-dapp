import "./App.css";
import Nav from "./components/landing-page/nav";
import Hero from "./components/landing-page/hero";
import Features from "./components/landing-page/features";
import Tiers from "./components/landing-page/tiers";
import HowItWorks from "./components/landing-page/how-it-works";
import Benefits from "./components/landing-page/benefits";
import Cta from "./components/landing-page/cta";
import Footer from "./components/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <Nav />
      <Hero />
      <Features />
      <Tiers />
      <HowItWorks />
      <Benefits />
      <Cta />
      <Footer />
    </div>
  );
}
