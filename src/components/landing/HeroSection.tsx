import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Lock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      {/* Ambient gradient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-semibold text-primary mb-8">
              <ShieldCheck className="h-4 w-4" />
              Plataforma segura de pagamentos digitais
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-[4.2rem] font-extrabold tracking-tight leading-[1.08] mb-7"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
          >
            Checkout profissional
            <br />
            para seus{" "}
            <span className="text-gradient">produtos digitais</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
          >
            Venda e-books, cursos e mentorias com checkout de alta conversão,
            pagamentos via M-Pesa e e-Mola, e entrega automática. Simples, rápido e confiável.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
          >
            <Button variant="hero" size="lg" className="h-14 px-10 rounded-xl text-base font-semibold shadow-elevated" onClick={() => navigate("/register")}>
              Criar conta grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="heroOutline" size="lg" className="h-14 px-8 rounded-xl text-base" onClick={() => navigate("/login")}>
              Já tenho conta
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm px-4 py-3 shadow-soft">
              <Lock className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-muted-foreground">Dados criptografados</span>
            </div>
            <div className="flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm px-4 py-3 shadow-soft">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-muted-foreground">Checkout seguro</span>
            </div>
            <div className="flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm px-4 py-3 shadow-soft">
              <TrendingUp className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-muted-foreground">Alta conversão</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
