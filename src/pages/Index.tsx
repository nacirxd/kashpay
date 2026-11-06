import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import IntegrationsSection from "@/components/landing/IntegrationsSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import TrustSection from "@/components/landing/TrustSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import FooterSection from "@/components/landing/FooterSection";

const Index = () => (
  <div className="min-h-screen bg-background text-foreground font-body antialiased">
    <Navbar />
    <main>
      <HeroSection />
      <IntegrationsSection />
      <BenefitsSection />
      <HowItWorksSection />
      <TrustSection />
      <FAQSection />
      <CTASection />
    </main>
    <FooterSection />
  </div>
);

export default Index;
