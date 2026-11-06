import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Lock, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import mpesaLogo from "@/assets/mpesa.svg";
import emolaLogo from "@/assets/emola.svg";

const PaymentMock = () => (
  <div className="relative mx-auto w-full max-w-[380px]">
    <div className="absolute -inset-6 rounded-[2.5rem] bg-primary/15 blur-3xl" aria-hidden />
    <div className="relative rounded-[2rem] border border-border/70 bg-card p-5 shadow-elevated">
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <p className="text-xs text-muted-foreground">Pagamento</p>
          <p className="font-display font-semibold">Curso de Marketing</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
          <Lock className="h-3 w-3" /> Seguro
        </span>
      </div>

      <div className="py-5">
        <p className="text-xs text-muted-foreground">Total a pagar</p>
        <p className="font-display text-4xl font-bold tracking-tight">
          1 500<span className="text-lg font-semibold text-muted-foreground"> MT</span>
        </p>
      </div>

      <p className="text-xs font-medium text-muted-foreground mb-2">Método de pagamento</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-center rounded-xl border-2 border-primary bg-accent/50 p-3 h-14">
          <img src={mpesaLogo} alt="M-Pesa" className="h-6 w-auto" loading="eager" />
        </div>
        <div className="flex items-center justify-center rounded-xl border border-border p-3 h-14">
          <img src={emolaLogo} alt="e-Mola" className="h-6 w-auto" loading="eager" />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">84 ••• ••• 21</div>
      <div className="mt-4 h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center">
        Pagar agora
      </div>
    </div>

    <motion.div
      className="absolute -left-4 sm:-left-12 top-24 flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-card"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
    >
      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
        <Smartphone className="h-4 w-4 text-primary" />
      </div>
      <div className="text-xs">
        <p className="font-semibold">Confirme com o PIN</p>
        <p className="text-muted-foreground">no seu telemóvel</p>
      </div>
    </motion.div>

    <motion.div
      className="absolute -right-3 sm:-right-10 -bottom-5 flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
    >
      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
        <Check className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="text-xs">
        <p className="font-semibold">Pagamento confirmado</p>
        <p className="text-muted-foreground">Acesso libertado</p>
      </div>
    </motion.div>
  </div>
);

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section id="inicio" className="relative overflow-hidden scroll-mt-20">
      <div
        className="absolute inset-0 -z-10 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent)",
        }}
      />
      <div className="absolute -top-40 right-[-10%] -z-10 h-[520px] w-[520px] rounded-full bg-primary/10 blur-[120px]" aria-hidden />

      <div className="container px-5 md:px-8 pt-12 pb-20 md:pt-20 md:pb-28 grid lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-10 items-center">
        <div>
          <motion.p
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Pagamentos digitais em Moçambique
          </motion.p>

          <motion.h1
            className="mt-6 font-display text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-[4.25rem] font-bold tracking-[-0.035em]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.6 }}
          >
            Receba pagamentos.
            <br />
            <span className="text-primary">Simples, rápido</span> e seguro.
          </motion.h1>

          <motion.p
            className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.6 }}
          >
            Venda os seus produtos digitais com um checkout feito para o telemóvel. O cliente paga com M-Pesa ou e-Mola
            e recebe o acesso assim que o pagamento é confirmado.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.6 }}
          >
            <Button size="lg" className="group h-12 rounded-full px-7 text-base font-semibold" onClick={() => navigate("/registro")}>
              Criar conta grátis
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-full px-7 text-base font-semibold" asChild>
              <a href="#como-funciona">Ver como funciona</a>
            </Button>
          </motion.div>

          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Sem mensalidade", "Entrega automática", "Painel de vendas"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
          <PaymentMock />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
