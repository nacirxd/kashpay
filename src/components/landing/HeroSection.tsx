import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Lock, TrendingUp, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-background">
      {/* Ambient gradient blobs */}
      <div className="absolute top-[-15%] left-[-8%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary/6 blur-[80px]" />

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
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
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm font-semibold text-primary mb-8">
              <ShieldCheck className="h-4 w-4" />
              Plataforma segura de pagamentos digitais
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-[4.2rem] font-extrabold tracking-tight leading-[1.08] mb-7 text-foreground"
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
            <Button
              size="lg"
              className="h-14 px-10 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_8px_30px_hsl(160_84%_39%/0.3)]"
              onClick={() => navigate("/registro")}
            >
              Criar conta grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-14 px-8 rounded-xl text-base font-medium border-border hover:bg-muted"
              onClick={() => navigate("/login")}
            >
              Já tenho conta
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {[
              { icon: Lock, label: "Dados criptografados" },
              { icon: ShieldCheck, label: "Checkout seguro" },
              { icon: TrendingUp, label: "Alta conversão" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground/70">{item.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Social proof bar */}
          <motion.div
            className="mt-12 pt-8 border-t border-border/40 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            {[
              "Sem mensalidade",
              "Pagamentos M-Pesa & e-Mola",
              "Entrega automática",
              "Dashboard completo",
            ].map((text) => (
              <div key={text} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
