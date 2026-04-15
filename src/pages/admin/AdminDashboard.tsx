import { useEffect, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingCart, DollarSign, Wallet, Bell, Package } from "lucide-react";
import { formatMZN } from "@/lib/currency";
import { formatDateTimeMZ } from "@/lib/timezone";
import { toast } from "sonner";

interface Stats {
  total_users: number;
  total_sales: number;
  total_revenue: number;
  pending_withdrawals: number;
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

const AdminDashboard = () => {
  const { adminFetch } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadStats = () => {
    adminFetch("stats").then(setStats).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();

    // Listen for new products
    const productChannel = supabase
      .channel("admin-products")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "products" },
        (payload) => {
          const p = payload.new as any;
          const notif: Notification = {
            id: crypto.randomUUID(),
            type: "product",
            message: `Novo produto criado: "${p.nome}"`,
            time: new Date().toISOString(),
          };
          setNotifications((prev) => [notif, ...prev].slice(0, 20));
          toast.info(`📦 Novo produto: ${p.nome}`, { duration: 5000 });
          loadStats();
        }
      )
      .subscribe();

    // Listen for new withdrawals
    const withdrawalChannel = supabase
      .channel("admin-withdrawals")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "withdrawals" },
        (payload) => {
          const w = payload.new as any;
          const notif: Notification = {
            id: crypto.randomUUID(),
            type: "withdrawal",
            message: `Novo pedido de saque: ${formatMZN(Number(w.valor))}`,
            time: new Date().toISOString(),
          };
          setNotifications((prev) => [notif, ...prev].slice(0, 20));
          toast.warning(`💰 Novo saque solicitado: ${formatMZN(Number(w.valor))}`, { duration: 5000 });
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productChannel);
      supabase.removeChannel(withdrawalChannel);
    };
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

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
      <div className="rounded-xl border border-gray-800 bg-[#13151d] p-5">
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
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-3"
              >
                <div className={`rounded-lg p-1.5 ${n.type === "product" ? "bg-blue-500/10" : "bg-yellow-500/10"}`}>
                  {n.type === "product" ? (
                    <Package className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Wallet className="h-4 w-4 text-yellow-400" />
                  )}
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
    </AdminLayout>
  );
};

export default AdminDashboard;
