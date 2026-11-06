import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "Quais métodos de pagamento são aceites?", a: "M-Pesa e e-Mola. O cliente introduz o número, recebe o pedido no telemóvel e confirma com o PIN." },
  { q: "Como sei que o pagamento foi confirmado?", a: "A venda só passa a aprovada quando a operadora confirma o pagamento. O cliente vê a confirmação e é levado ao material, e o vendedor recebe o aviso da venda." },
  { q: "E se eu sair da página enquanto pago?", a: "Pode voltar ao checkout. A página verifica o estado do pagamento antes de mostrar qualquer erro." },
  { q: "Como funcionam os reembolsos?", a: "Os reembolsos são tratados com o vendedor do produto. Use o contacto de suporte indicado no checkout." },
  { q: "Quanto custa para começar?", a: "Criar conta é grátis e não há mensalidade. É cobrada apenas uma taxa por venda." },
  { q: "Quando posso levantar o dinheiro das vendas?", a: "O valor de cada venda aprovada fica disponível para levantamento 7 dias depois, e pode pedir o saque no painel." },
  { q: "Como falo com o suporte?", a: "Se é vendedor, entre no painel. Se é cliente, use o contacto de suporte do vendedor indicado no checkout." },
];

const FAQSection = () => (
  <section id="faq" className="py-20 md:py-28 bg-muted/40 scroll-mt-20">
    <div className="container px-5 md:px-8 grid lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16">
      <div>
        <p className="text-sm font-semibold text-primary">FAQ</p>
        <h2 className="mt-3 font-display text-3xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1]">Perguntas frequentes</h2>
        <p className="mt-4 text-muted-foreground text-lg">Pagamentos, confirmações, reembolsos e suporte.</p>
      </div>
      <Accordion type="single" collapsible className="divide-y divide-border/70 border-y border-border/70">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="border-0">
            <AccordionTrigger className="text-left font-display font-semibold text-base md:text-lg py-6 hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQSection;
