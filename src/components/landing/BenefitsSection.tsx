import { motion } from "framer-motion";
import { ShieldCheck, MousePointerClick, Zap, Smartphone } from "lucide-react";

const items = [
  { icon: ShieldCheck, title: "Transações seguras", text: "Cada venda só é aprovada depois de o pagamento ser confirmado pelo servidor." },
  { icon: MousePointerClick, title: "Pagamento simples", text: "Um formulário curto: nome, contacto, número e PIN. Nada mais." },
  { icon: Zap, title: "Processamento rápido", text: "Assim que o PIN é confirmado, o cliente segue logo para o produto." },
  { icon: Smartphone, title: "Feito para o telemóvel", text: "Checkout pensado para ecrãs pequenos e para quem compra pelo WhatsApp." },
];

const BenefitsSection = () => (
  <section id="beneficios" className="py-20 md:py-28 bg-muted/40 scroll-mt-20">
    <div className="container px-5 md:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary">Porquê KashPay</p>
        <h2 className="mt-3 font-display text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1]">
          Tudo o que precisa para vender, sem complicação.
        </h2>
      </div>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-3xl border border-border/70 bg-border/70">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            className="bg-card p-7 md:p-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="h-11 w-11 rounded-2xl bg-accent flex items-center justify-center">
              <it.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mt-6 font-display text-lg font-semibold">{it.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{it.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default BenefitsSection;
