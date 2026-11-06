import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 md:py-28">
      <div className="container px-5 md:px-8 text-center max-w-3xl">
        <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">Comece a receber hoje.</h2>
        <p className="mt-4 text-lg text-muted-foreground">Crie a sua conta grátis e partilhe o primeiro link de pagamento em minutos.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="group rounded-full px-7 font-semibold" onClick={() => navigate("/registro")}>
            Criar conta grátis <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button size="lg" variant="outline" className="rounded-full px-7 font-semibold" onClick={() => navigate("/login")}>Entrar</Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
