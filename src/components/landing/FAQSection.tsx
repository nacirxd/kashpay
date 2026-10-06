import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  { q: "Quanto custa para começar?", a: "Você pode começar gratuitamente, sem nenhum custo mensal. Cobramos apenas uma pequena taxa por venda realizada. Sem surpresas, sem custos ocultos." },
  { q: "Quais tipos de produto posso vender?", a: "E-books, cursos online, templates, mentorias, arquivos digitais, softwares e qualquer produto que possa ser entregue digitalmente." },
  { q: "Como recebo meus pagamentos?", a: "Os valores das vendas ficam disponíveis na sua conta KashPay e podem ser sacados via M-Pesa, e-Mola ou transferência bancária." },
  { q: "O checkout é seguro?", a: "Sim, 100%. Utilizamos criptografia de ponta a ponta e protocolos de segurança avançados para proteger os dados dos seus clientes." },
  { q: "Quanto tempo leva para o cliente receber o produto?", a: "A entrega é instantânea. Assim que o pagamento é confirmado, o cliente recebe automaticamente o acesso ao produto." },
  { q: "Preciso de conhecimento técnico?", a: "Não. A plataforma foi criada para ser simples. Qualquer pessoa pode criar um produto e começar a vender em minutos." },
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
          <span className="inline-block text-sm font-semibold text-primary mb-3 tracking-wide uppercase">Dúvidas</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Perguntas frequentes</h2>
          <p className="text-muted-foreground text-lg">Tudo que você precisa saber antes de começar</p>
        </motion.div>

        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border border-border/50 rounded-xl px-6 bg-card shadow-soft data-[state=open]:shadow-card data-[state=open]:border-primary/20 transition-all">
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5 text-[15px]">
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
