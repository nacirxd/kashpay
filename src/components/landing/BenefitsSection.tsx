import { motion } from "framer-motion";
import { Zap, Shield, BarChart3, Smartphone, CreditCard, FileText } from "lucide-react";

const benefits = [
  {
    icon: Zap,
    title: "Checkout ultrarrápido",
    desc: "Página de vendas otimizada para máxima conversão. Seus clientes finalizam a compra em segundos.",
    highlight: "Até 3x mais conversão",
  },
  {
    icon: Shield,
    title: "Pagamentos seguros",
    desc: "Transações protegidas com criptografia de ponta. Seus dados e dos seus clientes sempre seguros.",
    highlight: "100% seguro",
  },
  {
    icon: BarChart3,
    title: "Métricas em tempo real",
    desc: "Dashboard completo com receita, conversão, origem de tráfego e desempenho de cada produto.",
    highlight: "Dados ao vivo",
  },
  {
    icon: Smartphone,
    title: "M-Pesa & e-Mola",
    desc: "Aceite pagamentos via mobile money. Seus clientes pagam com o método que já conhecem e confiam.",
    highlight: "Pagamento local",
  },
  {
    icon: CreditCard,
    title: "Sem mensalidade",
    desc: "Comece a vender sem custos fixos. Pague apenas uma pequena taxa por venda realizada.",
    highlight: "0 MT/mês",
  },
  {
    icon: FileText,
    title: "Entrega automática",
    desc: "Arquivos, links e conteúdos entregues instantaneamente após a confirmação do pagamento.",
    highlight: "Entrega instantânea",
  },
];

const BenefitsSection = () => {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />
      <div className="container px-4 md:px-6 relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wide uppercase">Vantagens</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-5">Tudo que você precisa para vender online</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Ferramentas profissionais para criar, vender e escalar seus produtos digitais em Moçambique e no mundo.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              className="group relative rounded-2xl border border-border/50 bg-card p-7 shadow-soft hover:shadow-card hover:border-primary/20 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <b.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-base font-semibold">{b.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">{b.desc}</p>
                  <span className="inline-block text-xs font-semibold text-primary bg-primary/8 px-2.5 py-1 rounded-md">
                    {b.highlight}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
