import { useEffect, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { Users, ShoppingCart, DollarSign, Wallet } from "lucide-react";
import { formatMZN } from "@/lib/currency";

interface Stats {
  total_users: number;
  total_sales: number;
  total_revenue: number;
  pending_withdrawals: number;
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

  useEffect(() => {
    adminFetch("stats").then(setStats).finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </AdminLayout>
  );
};

export default AdminDashboard;
