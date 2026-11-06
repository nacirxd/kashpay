import { motion } from "framer-motion";
import { Link2, Smartphone, PackageCheck } from "lucide-react";

const steps = [
  { icon: Link2, title: "Partilhe o link", text: "Crie o seu produto e envie o link do checkout aos clientes." },
  { icon: Smartphone, title: "O cliente paga", text: "Escolhe M-Pesa ou e-Mola e confirma com o PIN no telemóvel." },
  { icon: PackageCheck, title: "Acesso imediato", text: "A venda é aprovada e o cliente é levado direto ao material." },
];

const HowItWorksSection = () => (
  <section id="como-funciona" className="py-20 md:py-28 scroll-mt-20">
    <div className="container px-5 md:px-8">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-sm font-semibold text-primary">Como funciona</p>
        <h2 className="mt-3 font-display text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1]">
          Do link ao pagamento em três passos.
        </h2>
      </div>

      <ol className="mt-14 grid md:grid-cols-3 gap-6 md:gap-8 relative">
        <div className="hidden md:block absolute top-7 left-[16%] right-[16%] h-px bg-border" aria-hidden />
        {steps.map((s, i) => (
          <motion.li
            key={s.title}
            className="relative text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
          >
            <div className="relative mx-auto h-14 w-14 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-card">
              <s.icon className="h-6 w-6" />
              <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold">{s.title}</h3>
            <p className="mt-2 text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.text}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  </section>
);

export default HowItWorksSection;
