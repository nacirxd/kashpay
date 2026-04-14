import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import IntegrationsSection from "@/components/landing/IntegrationsSection";
import FAQSection from "@/components/landing/FAQSection";
import FooterSection from "@/components/landing/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <div id="beneficios"><BenefitsSection /></div>
      <div id="como-funciona"><HowItWorksSection /></div>
      <div id="integracoes"><IntegrationsSection /></div>
      <div id="faq"><FAQSection /></div>
      <FooterSection />
    </div>
  );
};

export default Index;
