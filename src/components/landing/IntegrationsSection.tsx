import { motion } from "framer-motion";
import mpesaLogo from "@/assets/mpesa.svg";
import emolaLogo from "@/assets/emola.svg";
import { Webhook, MessageSquare, Zap, BarChart3, Target, Tag } from "lucide-react";

interface IntegrationItem {
  name: string;
  desc: string;
  icon?: React.ComponentType<{ className?: string }>;
  logo?: string;
}

const integrations: IntegrationItem[] = [
  { logo: mpesaLogo, name: "M-Pesa", desc: "Pagamentos via M-Pesa" },
  { logo: emolaLogo, name: "e-Mola", desc: "Pagamentos via e-Mola" },
  { icon: MessageSquare, name: "WhatsApp", desc: "Entrega automática" },
  { icon: Target, name: "Meta Ads", desc: "Pixel + Conversion API" },
  { icon: Tag, name: "Google Tag", desc: "Tags e eventos" },
  { icon: Webhook, name: "Webhook", desc: "Eventos personalizados" },
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
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wide uppercase">Ecossistema</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Integrações que você precisa</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Conecte com M-Pesa, e-Mola, WhatsApp e mais. Tudo pronto para funcionar.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {integrations.map((int, i) => (
            <motion.div
              key={int.name}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card p-6 shadow-soft hover:shadow-card hover:border-primary/20 transition-all duration-300 group"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              {int.logo ? (
                <img src={int.logo} alt={int.name} className="h-10 w-10 object-contain" />
              ) : int.icon ? (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <int.icon className="h-5 w-5" />
                </div>
              ) : null}
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
