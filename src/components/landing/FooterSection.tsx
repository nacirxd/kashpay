import kashpayLogo from "@/assets/kashpay-logo.png";
import { Link } from "react-router-dom";

const FooterSection = () => (
  <footer className="border-t border-border/70">
    <div className="container px-5 md:px-8 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-3 sm:col-span-2 lg:col-span-1">
        <div className="flex items-center gap-2.5">
          <img src={kashpayLogo} alt="" width={28} height={28} className="h-7 w-7 rounded-lg" loading="lazy" />
          <span className="font-display font-bold">KashPay</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">Pagamentos digitais com M-Pesa e e-Mola em Moçambique.</p>
      </div>
      <div>
        <h3 className="text-sm font-semibold">Plataforma</h3>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          <li><a href="#como-funciona" className="hover:text-foreground">Como funciona</a></li>
          <li><a href="#pagamentos" className="hover:text-foreground">Métodos de pagamento</a></li>
          <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold">Conta</h3>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          <li><Link to="/login" className="hover:text-foreground">Entrar</Link></li>
          <li><Link to="/registro" className="hover:text-foreground">Criar conta</Link></li>
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold">Suporte e legal</h3>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          <li><a href="#faq" className="hover:text-foreground">Apoio ao cliente</a></li>
          <li>Termos e condições <span className="text-xs">(em breve)</span></li>
          <li>Política de privacidade <span className="text-xs">(em breve)</span></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-border/70">
      <p className="container px-5 md:px-8 py-6 text-xs text-muted-foreground">© {new Date().getFullYear()} KashPay. Todos os direitos reservados.</p>
    </div>
  </footer>
);

export default FooterSection;
