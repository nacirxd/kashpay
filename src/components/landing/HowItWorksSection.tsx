import { motion } from "framer-motion";
import { Upload, Palette, Rocket } from "lucide-react";

const steps = [
  {
    icon: Upload,
    num: "1",
    title: "Crie seu produto",
    desc: "Faça upload do seu arquivo ou adicione o link de acesso. Configure o preço e a descrição em poucos minutos.",
  },
  {
    icon: Palette,
    num: "2",
    title: "Compartilhe o link",
    desc: "Copie o link do seu checkout e divulgue nas redes sociais, WhatsApp ou onde quiser. Sem complicação.",
  },
  {
    icon: Rocket,
    num: "3",
    title: "Receba pagamentos",
    desc: "Seus clientes pagam via M-Pesa ou e-Mola e recebem o produto automaticamente. Você recebe na hora.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 md:py-32 bg-muted/30">
      <div className="container px-4 md:px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wide uppercase">Simples e rápido</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Comece a vender em 3 passos</h2>
          <p className="text-muted-foreground text-lg">Sem burocracia, sem conhecimento técnico</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              className="relative text-center group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-border/60" />
              )}

              <div className="relative inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-card border border-border/60 shadow-card mb-6 group-hover:border-primary/30 transition-colors">
                <s.icon className="h-8 w-8 text-primary" />
                <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm">
                  {s.num}
                </span>
              </div>

              <h3 className="text-lg font-semibold mb-3">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm max-w-xs mx-auto">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
