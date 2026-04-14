import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  { q: "Quanto custa para começar?", a: "Você pode começar gratuitamente. Cobramos apenas uma pequena taxa por venda realizada, sem mensalidades ou custos ocultos." },
  { q: "Quais tipos de produto posso vender?", a: "Cursos online, e-books, templates, softwares, mentorias, assinaturas e qualquer produto digital." },
  { q: "Como recebo meus pagamentos?", a: "Os pagamentos são processados e transferidos automaticamente para sua conta bancária conforme o período configurado." },
  { q: "Posso ter afiliados vendendo meu produto?", a: "Sim! Nosso sistema de afiliados permite criar links exclusivos, definir comissões e acompanhar vendas de cada afiliado." },
  { q: "Quais moedas são aceitas?", a: "Atualmente suportamos BRL (Real), USD (Dólar) e MZN (Metical), com mais moedas em breve." },
];

const FAQSection = () => {
  return (
    <section className="py-24 md:py-32 bg-muted/30">
      <div className="container px-4 md:px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Perguntas frequentes</h2>
          <p className="text-muted-foreground text-lg">Tire suas dúvidas sobre a plataforma</p>
        </motion.div>

        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border border-border/50 rounded-xl px-6 bg-card shadow-soft">
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
