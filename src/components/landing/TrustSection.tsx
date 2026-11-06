import { CheckCircle2 } from "lucide-react";

const points = [
  "O pedido de pagamento chega ao telemóvel do cliente, que confirma com o próprio PIN.",
  "A venda só é marcada como paga depois de a operadora confirmar o pagamento.",
  "Ninguém consegue aprovar uma venda a partir do navegador. Só o nosso servidor o faz.",
  "O vendedor recebe aviso de cada venda aprovada no painel e no telemóvel.",
];

const TrustSection = () => (
  <section className="py-20 md:py-28">
    <div className="container px-5 md:px-8">
      <div className="rounded-[2rem] bg-foreground text-background p-8 md:p-14 grid lg:grid-cols-2 gap-10 lg:gap-16">
        <div>
          <p className="text-sm font-semibold text-primary">Confirmação de pagamentos</p>
          <h2 className="mt-3 font-display text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.1]">
            Cada venda é confirmada antes do acesso.
          </h2>
          <p className="mt-4 opacity-70 text-lg leading-relaxed">
            Assim, o vendedor sabe que recebeu e o cliente sabe que vai receber o que comprou.
          </p>
        </div>
        <ul className="space-y-5">
          {points.map((p) => (
            <li key={p} className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="opacity-90 leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export default TrustSection;
