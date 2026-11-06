import { motion } from "framer-motion";
import mpesaLogo from "@/assets/mpesa.svg";
import emolaLogo from "@/assets/emola.svg";

const methods = [
  { logo: mpesaLogo, name: "M-Pesa", by: "Vodacom", text: "O cliente recebe o pedido no telemóvel e confirma com o PIN M-Pesa." },
  { logo: emolaLogo, name: "e-Mola", by: "Movitel", text: "Pagamento direto pela carteira e-Mola, confirmado com o PIN." },
];

const IntegrationsSection = () => (
  <section id="pagamentos" className="py-20 md:py-28 scroll-mt-20">
    <div className="container px-5 md:px-8">
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-16 items-center">
        <div>
          <p className="text-sm font-semibold text-primary">Métodos de pagamento</p>
          <h2 className="mt-3 font-display text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1]">
            As carteiras que os seus clientes já usam.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            Sem cartão, sem conta bancária. Basta o número de telemóvel e o PIN.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {methods.map((m, i) => (
            <motion.article
              key={m.name}
              className="group rounded-3xl border border-border/70 bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-elevated"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="h-16 flex items-center">
                <img src={m.logo} alt={`Logótipo ${m.name}`} className="h-14 w-auto rounded-xl" loading="lazy" />
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold">{m.name}</h3>
              <p className="text-xs font-medium text-muted-foreground">{m.by}</p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{m.text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default IntegrationsSection;
