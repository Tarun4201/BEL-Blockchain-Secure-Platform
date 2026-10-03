import { HeroSection } from "@/components/landing/HeroSection";
import { LedgerTicker } from "@/components/landing/LedgerTicker";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PersonaLoginGrid } from "@/components/landing/PersonaLoginGrid";
import { LandingNav, TrustStrip, LandingFooter } from "@/components/landing/LandingNav";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main id="main-content">
        <HeroSection />
        <LedgerTicker />
        <HowItWorksSection />
        <PersonaLoginGrid />
        <TrustStrip />
      </main>
      <LandingFooter />
    </>
  );
}
