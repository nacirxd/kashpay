import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 md:py-32">
      <div className="container px-4 md:px-6">
        <motion.div
          className="relative max-w-4xl mx-auto text-center rounded-3xl bg-foreground p-12 md:p-16 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-primary/10 blur-[80px]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1.5 text-sm font-semibold text-primary mb-6">
              <ShieldCheck className="h-4 w-4" />
              Comece sem custos
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-5 text-background">
              Pronto para vender seus produtos digitais?
            </h2>
            <p className="text-background/60 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Crie sua conta gratuita e comece a receber pagamentos em minutos. Sem mensalidades, sem burocracia.
            </p>

            <Button
              size="lg"
              className="h-14 px-10 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_8px_30px_hsl(160_84%_39%/0.4)]"
              onClick={() => navigate("/register")}
            >
              Criar minha conta grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
