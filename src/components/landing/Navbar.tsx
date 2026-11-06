import kashpayLogo from "@/assets/kashpay-logo.png";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const links = [
  { href: "#inicio", label: "Início" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#pagamentos", label: "Métodos de pagamento" },
  { href: "#faq", label: "FAQ" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled || open ? "border-b border-border/60 bg-background/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav aria-label="Principal" className="container flex h-16 md:h-[72px] items-center justify-between px-5 md:px-8">
        <a href="#inicio" className="flex items-center gap-2.5" aria-label="KashPay, início">
          <img src={kashpayLogo} alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
          <span className="font-display font-bold text-lg tracking-tight">KashPay</span>
        </a>

        <div className="hidden lg:flex items-center gap-1 text-sm font-medium text-muted-foreground">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-4 py-2 hover:text-foreground hover:bg-muted/70 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <Button variant="ghost" size="sm" className="rounded-full font-semibold" onClick={() => navigate("/login")}>Entrar</Button>
          <Button size="sm" className="rounded-full font-semibold px-5" onClick={() => navigate("/registro")}>Criar conta</Button>
        </div>

        <button
          className="lg:hidden -mr-2 p-2 rounded-full hover:bg-muted transition-colors"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden border-t border-border/50 px-5 pb-6 pt-3 animate-in slide-in-from-top-2">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="block py-3 text-base font-medium border-b border-border/40" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <div className="pt-5 grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-full" onClick={() => { setOpen(false); navigate("/login"); }}>Entrar</Button>
            <Button className="rounded-full" onClick={() => { setOpen(false); navigate("/registro"); }}>Criar conta</Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
