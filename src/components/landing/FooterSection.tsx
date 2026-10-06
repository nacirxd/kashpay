import kashpayLogo from "@/assets/kashpay-pay-logo.svg";
import { Lock } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="container px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img src={kashpayLogo} alt="KashPay" className="h-8 w-8 rounded-xl" />
              <span className="font-bold text-lg">KashPay</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Plataforma de checkout para produtos digitais em Moçambique. Simples, segura e confiável.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Plataforma</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a href="#beneficios" className="block hover:text-foreground transition-colors">Benefícios</a>
              <a href="#como-funciona" className="block hover:text-foreground transition-colors">Como funciona</a>
              <a href="#integracoes" className="block hover:text-foreground transition-colors">Integrações</a>
              <a href="#faq" className="block hover:text-foreground transition-colors">FAQ</a>
            </div>
          </div>

          {/* Trust */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Segurança</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 text-primary" />
              <span>Dados criptografados</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Todas as transações são protegidas com criptografia de ponta a ponta.
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} KashPay. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Ambiente seguro</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
