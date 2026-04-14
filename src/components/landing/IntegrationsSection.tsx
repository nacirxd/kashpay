import { motion } from "framer-motion";
import { Webhook, BarChart3, MessageSquare, Zap, Target, Link2 } from "lucide-react";

const integrations = [
  { icon: Target, name: "Meta Ads", desc: "Facebook Pixel + Conversion API" },
  { icon: Link2, name: "UTMify", desc: "Rastreamento de UTMs" },
  { icon: Webhook, name: "Webhook", desc: "Eventos personalizados" },
  { icon: MessageSquare, name: "WhatsApp", desc: "Entrega automática" },
  { icon: Zap, name: "n8n", desc: "Automações avançadas" },
  { icon: BarChart3, name: "Analytics", desc: "Métricas em tempo real" },
];

const IntegrationsSection = () => {
  return (
    <section className="py-24 md:py-32">
      <div className="container px-4 md:px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Integrações poderosas</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Conecte com as ferramentas que você já usa e automatize todo o fluxo.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {integrations.map((int, i) => (
            <motion.div
              key={int.name}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card p-6 shadow-soft hover:shadow-card hover:border-primary/20 transition-all duration-300"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <int.icon className="h-5 w-5" />
              </div>
              <span className="font-semibold text-sm">{int.name}</span>
              <span className="text-xs text-muted-foreground text-center">{int.desc}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
