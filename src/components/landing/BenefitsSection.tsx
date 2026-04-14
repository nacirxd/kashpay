import { motion } from "framer-motion";
import { Zap, Shield, BarChart3, Globe, CreditCard, Users } from "lucide-react";

const benefits = [
  { icon: Zap, title: "Checkout ultrarrápido", desc: "Página de vendas otimizada para máxima conversão com design premium." },
  { icon: Shield, title: "Pagamentos seguros", desc: "Multi-moeda (BRL, USD, MZN) com proteção antifraude integrada." },
  { icon: BarChart3, title: "Métricas avançadas", desc: "Acompanhe receita, conversão, abandono e ticket médio em tempo real." },
  { icon: Globe, title: "Alcance global", desc: "Venda para qualquer lugar do mundo com suporte multi-idioma." },
  { icon: CreditCard, title: "Múltiplos pagamentos", desc: "Pix, cartão, boleto e mais. Seus clientes escolhem como pagar." },
  { icon: Users, title: "Sistema de afiliados", desc: "Crie sua rede de afiliados com links exclusivos e comissões flexíveis." },
];

const BenefitsSection = () => {
  return (
    <section className="py-24 md:py-32">
      <div className="container px-4 md:px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que você precisa para escalar</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Ferramentas poderosas para criar, vender e gerenciar seus produtos digitais.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              className="group rounded-2xl border border-border/50 bg-card p-8 shadow-soft hover:shadow-card transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <b.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{b.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
