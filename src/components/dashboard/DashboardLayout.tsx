import aureonLogo from "@/assets/aureon-pay-logo.svg";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/hooks/use-theme";
import {
  LayoutDashboard, Package, Link2, Settings, LogOut,
  DollarSign, Menu, X, Moon, Sun, ShoppingCart
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Package, label: "Produtos", path: "/produtos" },
  { icon: ShoppingCart, label: "Vendas", path: "/vendas" },
  { icon: Link2, label: "Integrações", path: "/integracoes" },
  { icon: DollarSign, label: "Finanças", path: "/financas" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

const TIERS = [
  { label: "Bronze", min: 0, max: 100_000, bg: "bg-amber-100", color: "text-amber-700", icon: "🥉" },
  { label: "Prata", min: 100_000, max: 500_000, bg: "bg-slate-100", color: "text-slate-500", icon: "🥈" },
  { label: "Ouro", min: 500_000, max: 1_000_000, bg: "bg-yellow-100", color: "text-yellow-500", icon: "🥇" },
  { label: "Diamante", min: 1_000_000, max: 5_000_000, bg: "bg-cyan-100", color: "text-cyan-500", icon: "💎" },
  { label: "Elite", min: 5_000_000, max: 10_000_000, bg: "bg-purple-100", color: "text-purple-500", icon: "👑" },
];

function formatTierValue(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return v.toString();
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const { dark, toggle: toggleTheme } = useTheme();
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState("");

  const metadataName = useMemo(() => {
    const rawName = user?.user_metadata?.nome;
    return typeof rawName === "string" ? rawName.trim() : "";
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUserName("");
      setTotalRevenue(0);
      return;
    }

    setUserName(metadataName);
    let isCancelled = false;

    const load = async () => {
      const [{ data: profile }, { data: sales }] = await Promise.all([
        supabase.from("profiles").select("nome").eq("user_id", user.id).single(),
        supabase.from("sales").select("valor, status").eq("user_id", user.id).eq("status", "approved"),
      ]);

      if (isCancelled) return;

      const profileName = typeof profile?.nome === "string" ? profile.nome.trim() : "";
      if (profileName) setUserName(profileName);
      setTotalRevenue((sales || []).reduce((a, s) => a + Number(s.valor), 0));
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [user, metadataName]);

  const { tier, progress } = useMemo(() => {
    const t = TIERS.find((item) => totalRevenue < item.max) || TIERS[TIERS.length - 1];
    const range = t.max - t.min;
    const p = Math.min(Math.max(((totalRevenue - t.min) / range) * 100, 0), 100);
    return { tier: t, progress: p };
  }, [totalRevenue]);

  const displayName = (userName || metadataName).trim();
  const firstName = displayName.split(/\s+/).filter(Boolean)[0] || "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-muted/30">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transform transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:relative lg:translate-x-0
      `}>
        <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
          <img src={aureonLogo} alt="Aureon Pay" className="h-8 w-8 rounded-lg" />
          <span className="font-bold text-lg text-sidebar-foreground">Aureon Pay</span>
          <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-6">
          <div className="flex items-center">
            <button className="lg:hidden mr-3" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold">
              {firstName ? (
                <>
                  Olá, <span className="capitalize">{firstName}</span>
                </>
              ) : (
                "Olá"
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={dark ? "Modo claro" : "Modo escuro"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tier.bg} ${tier.color}`}>
              <span>{tier.icon}</span>
              {tier.label}
              <span className="font-normal opacity-70">MT {formatTierValue(tier.min)} – {formatTierValue(tier.max)}</span>
            </div>
            <div className="w-24">
              <Progress value={progress} className="h-2" />
            </div>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs uppercase">
              {firstName.slice(0, 2).toUpperCase() || "U"}
            </div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
