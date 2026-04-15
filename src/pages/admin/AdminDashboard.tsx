import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingCart, DollarSign, Wallet, Bell, Package, Trophy, Calendar } from "lucide-react";
import { formatMZN } from "@/lib/currency";
import { formatDateTimeMZ } from "@/lib/timezone";
import { toast } from "sonner";

interface TopSeller {
  user_id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  total_revenue: number;
  total_sales: number;
}

interface Stats {
  total_users: number;
  total_sales: number;
  total_revenue: number;
  pending_withdrawals: number;
  top_sellers: TopSeller[];
}

interface Notification {
  id: string;
  type: "product" | "withdrawal";
  message: string;
  time: string;
}

const cards = [
  { key: "total_users" as const, label: "Usuários", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "total_sales" as const, label: "Vendas", icon: ShoppingCart, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { key: "total_revenue" as const, label: "Receita Total", icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-500/10", isMoney: true },
  { key: "pending_withdrawals" as const, label: "Saques Pendentes", icon: Wallet, color: "text-red-400", bg: "bg-red-500/10" },
];

type FilterPreset = "today" | "7d" | "30d" | "all" | "custom";

function getDateRange(preset: FilterPreset): { from: string | null; to: string | null } {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  if (preset === "all") return { from: null, to: null };
  if (preset === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    return { from: start, to: endOfDay };
  }
  if (preset === "7d") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return { from: start, to: endOfDay };
  }
  if (preset === "30d") {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return { from: start, to: endOfDay };
  }
  return { from: null, to: null };
}

const presets: { key: FilterPreset; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "all", label: "Tudo" },
  { key: "custom", label: "Personalizado" },
];

const AdminDashboard = () => {
  const { adminFetch } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterPreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const loadStats = useCallback((f?: FilterPreset, cf?: string, ct?: string) => {
    const activeFilter = f ?? filter;
    setLoading(true);
    let dateFrom: string | null = null;
    let dateTo: string | null = null;

    if (activeFilter === "custom") {
      dateFrom = (cf ?? customFrom) ? new Date(cf ?? customFrom).toISOString() : null;
      dateTo = (ct ?? customTo) ? new Date(new Date(ct ?? customTo).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString() : null;
    } else {
      const range = getDateRange(activeFilter);
      dateFrom = range.from;
      dateTo = range.to;
    }

    adminFetch("stats", {
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    })
      .then(setStats)
      .finally(() => setLoading(false));
  }, [filter, customFrom, customTo, adminFetch]);

  useEffect(() => {
    loadStats();

    const productChannel = supabase
      .channel("admin-products")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "products" }, (payload) => {
        const p = payload.new as any;
        const notif: Notification = {
          id: crypto.randomUUID(), type: "product",
          message: `Novo produto criado: "${p.nome}"`, time: new Date().toISOString(),
        };
        setNotifications((prev) => [notif, ...prev].slice(0, 20));
        toast.info(`📦 Novo produto: ${p.nome}`, { duration: 5000 });
        loadStats();
      })
      .subscribe();

    const withdrawalChannel = supabase
      .channel("admin-withdrawals")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "withdrawals" }, (payload) => {
        const w = payload.new as any;
        const notif: Notification = {
          id: crypto.randomUUID(), type: "withdrawal",
          message: `Novo pedido de saque: ${formatMZN(Number(w.valor))}`, time: new Date().toISOString(),
        };
        setNotifications((prev) => [notif, ...prev].slice(0, 20));
        toast.warning(`💰 Novo saque solicitado: ${formatMZN(Number(w.valor))}`, { duration: 5000 });
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(productChannel);
      supabase.removeChannel(withdrawalChannel);
    };
  }, []);

  const handleFilterChange = (f: FilterPreset) => {
    setFilter(f);
    if (f !== "custom") loadStats(f);
  };

  const handleCustomApply = () => {
    if (customFrom) loadStats("custom", customFrom, customTo);
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase() || "U";
  };

  const medalColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Calendar className="h-4 w-4 text-gray-500" />
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handleFilterChange(p.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === p.key
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-gray-800 text-gray-400 border border-gray-700 hover:text-gray-200"
            }`}
          >
            {p.label}
          </button>
        ))}
        {filter === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200 focus:border-emerald-500 focus:outline-none"
            />
            <span className="text-gray-500 text-xs">até</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={handleCustomApply}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.key} className="rounded-xl border border-gray-800 bg-[#13151d] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`rounded-lg p-2 ${c.bg}`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <span className="text-sm text-gray-400">{c.label}</span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? "..." : c.isMoney ? formatMZN(stats?.[c.key] || 0) : (stats?.[c.key] ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Notifications panel */}
      <div className="rounded-xl border border-gray-800 bg-[#13151d] p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold">Notificações em tempo real</h2>
          {notifications.length > 0 && (
            <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              {notifications.length}
            </span>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            Nenhuma notificação ainda. Notificações de novos produtos e saques aparecerão aqui em tempo real.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-3">
                <div className={`rounded-lg p-1.5 ${n.type === "product" ? "bg-blue-500/10" : "bg-yellow-500/10"}`}>
                  {n.type === "product" ? <Package className="h-4 w-4 text-blue-400" /> : <Wallet className="h-4 w-4 text-yellow-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDateTimeMZ(n.time)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Sellers */}
      <div className="rounded-xl border border-gray-800 bg-[#13151d] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h2 className="text-lg font-semibold">Top Vendedores</h2>
          <span className="text-xs text-gray-500 ml-1">
            ({filter === "all" ? "Todos os tempos" : filter === "today" ? "Hoje" : filter === "7d" ? "Últimos 7 dias" : filter === "30d" ? "Últimos 30 dias" : "Personalizado"})
          </span>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm py-4 text-center">Carregando...</p>
        ) : !stats?.top_sellers?.length ? (
          <p className="text-gray-500 text-sm py-4 text-center">Nenhuma venda no período selecionado.</p>
        ) : (
          <div className="space-y-2">
            {stats.top_sellers.map((seller, i) => (
              <div key={seller.user_id} className="flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-900/30 p-3">
                {/* Rank */}
                <div className="flex items-center justify-center w-8 h-8 shrink-0">
                  {i < 3 ? (
                    <span className={`text-lg font-bold ${medalColors[i]}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-gray-500">#{i + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold uppercase overflow-hidden shrink-0">
                  {seller.avatar_url ? (
                    <img src={seller.avatar_url} alt={seller.nome} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-gray-300">{initials(seller.nome)}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{seller.nome}</p>
                  <p className="text-xs text-gray-500 truncate">{seller.email}</p>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <p className="font-semibold text-emerald-400">{formatMZN(seller.total_revenue)}</p>
                  <p className="text-xs text-gray-500">{seller.total_sales} venda{seller.total_sales !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
