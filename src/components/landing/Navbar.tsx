import aureonLogo from "@/assets/aureon-pay-logo.svg";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const Navbar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-border/60 bg-background/90 backdrop-blur-xl shadow-soft" : "bg-transparent"}`}>
      <div className="container flex h-18 items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-2.5">
          <img src={aureonLogo} alt="Aureon Pay" className="h-9 w-9 rounded-xl" />
          <span className="font-bold text-xl tracking-tight">Aureon Pay</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#beneficios" className="hover:text-foreground transition-colors">Benefícios</a>
          <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
          <a href="#integracoes" className="hover:text-foreground transition-colors">Integrações</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" className="font-medium" onClick={() => navigate("/login")}>Entrar</Button>
          <Button size="sm" className="rounded-xl font-semibold px-5" onClick={() => navigate("/registro")}>Criar conta grátis</Button>
        </div>

        <button className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl p-5 space-y-1 animate-in slide-in-from-top-2">
          <a href="#beneficios" className="block text-sm py-3 px-3 rounded-lg hover:bg-muted transition-colors" onClick={() => setOpen(false)}>Benefícios</a>
          <a href="#como-funciona" className="block text-sm py-3 px-3 rounded-lg hover:bg-muted transition-colors" onClick={() => setOpen(false)}>Como funciona</a>
          <a href="#integracoes" className="block text-sm py-3 px-3 rounded-lg hover:bg-muted transition-colors" onClick={() => setOpen(false)}>Integrações</a>
          <a href="#faq" className="block text-sm py-3 px-3 rounded-lg hover:bg-muted transition-colors" onClick={() => setOpen(false)}>FAQ</a>
          <div className="pt-3 space-y-2">
            <Button variant="outline" className="w-full rounded-xl" onClick={() => { setOpen(false); navigate("/login"); }}>Entrar</Button>
            <Button className="w-full rounded-xl" onClick={() => { setOpen(false); navigate("/registro"); }}>Criar conta grátis</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
