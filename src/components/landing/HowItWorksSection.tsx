import { motion } from "framer-motion";

const steps = [
  { num: "01", title: "Crie seu produto", desc: "Faça upload do seu conteúdo digital e configure preços em minutos." },
  { num: "02", title: "Personalize o checkout", desc: "Checkout otimizado com order bump, upsell e cupons de desconto." },
  { num: "03", title: "Venda e escale", desc: "Receba pagamentos, ative afiliados e acompanhe métricas em tempo real." },
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Como funciona</h2>
          <p className="text-muted-foreground text-lg">Três passos para começar a vender</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              className="relative text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="text-6xl font-extrabold text-primary/10 mb-4">{s.num}</div>
              <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
