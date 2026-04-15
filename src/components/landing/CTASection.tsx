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
          className="relative max-w-4xl mx-auto text-center rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/8 to-transparent p-12 md:p-16 shadow-card overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 blur-[80px]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-6">
              <ShieldCheck className="h-4 w-4" />
              Comece sem custos
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-5">
              Pronto para vender seus produtos digitais?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Crie sua conta gratuita e comece a receber pagamentos em minutos. Sem mensalidades, sem burocracia.
            </p>

            <Button variant="hero" size="lg" className="h-14 px-10 rounded-xl text-base font-semibold shadow-elevated" onClick={() => navigate("/register")}>
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
