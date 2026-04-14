import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
          <span className="font-bold text-xl tracking-tight">Aureon Pay</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#beneficios" className="hover:text-foreground transition-colors">Benefícios</a>
          <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
          <a href="#integracoes" className="hover:text-foreground transition-colors">Integrações</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Entrar</Button>
          <Button size="sm" className="rounded-lg" onClick={() => navigate("/dashboard")}>Começar grátis</Button>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/50 bg-background p-4 space-y-3">
          <a href="#beneficios" className="block text-sm py-2" onClick={() => setOpen(false)}>Benefícios</a>
          <a href="#como-funciona" className="block text-sm py-2" onClick={() => setOpen(false)}>Como funciona</a>
          <a href="#integracoes" className="block text-sm py-2" onClick={() => setOpen(false)}>Integrações</a>
          <a href="#faq" className="block text-sm py-2" onClick={() => setOpen(false)}>FAQ</a>
          <Button className="w-full rounded-lg" onClick={() => { setOpen(false); navigate("/dashboard"); }}>Começar grátis</Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
