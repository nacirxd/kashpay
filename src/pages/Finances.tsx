import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { formatMZN } from "@/lib/currency";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Clock, AlertTriangle } from "lucide-react";

const Finances = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("sales").select("*, products(nome)").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setSales(data || []);
      setLoading(false);
    });
  }, [user]);

  const summary = useMemo(() => {
    const approved = sales.filter((s) => s.status === "approved");
    const pending = sales.filter((s) => s.status === "pending");
    const refunded = sales.filter((s) => s.status === "refunded" || s.status === "chargeback");
    return {
      saldo: approved.reduce((a, s) => a + Number(s.valor), 0),
      pendente: pending.reduce((a, s) => a + Number(s.valor), 0),
      reembolsado: refunded.reduce((a, s) => a + Number(s.valor), 0),
      total: sales.length,
    };
  }, [sales]);

  const statusColors: Record<string, string> = {
    approved: "text-primary",
    pending: "text-yellow-600",
    refunded: "text-orange-500",
    chargeback: "text-destructive",
  };

  const statusLabels: Record<string, string> = {
    approved: "Aprovado",
    pending: "Pendente",
    refunded: "Reembolsado",
    chargeback: "Chargeback",
  };

  const summaryCards = [
    { label: "Saldo disponível", value: formatMZN(summary.saldo), icon: DollarSign, color: "text-primary" },
    { label: "Pendente", value: formatMZN(summary.pendente), icon: Clock, color: "text-yellow-600" },
    { label: "Reembolsado", value: formatMZN(summary.reembolsado), icon: AlertTriangle, color: "text-orange-500" },
    { label: "Total transações", value: summary.total.toString(), icon: TrendingUp, color: "text-foreground" },
  ];

  return (
    <DashboardLayout>
      <h1 className="text-lg font-semibold mb-6">Finanças</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((card, i) => (
              <motion.div key={card.label} className="rounded-xl border border-border/50 bg-card p-5 shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div className="text-xl font-bold">{card.value}</div>
              </motion.div>
            ))}
          </div>

          <motion.div className="rounded-xl border border-border/50 bg-card shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Produto</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Valor</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">UTM Source</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sales.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Nenhuma transação registrada.</td></tr>
                  ) : sales.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-medium">{(s.products as any)?.nome || "-"}</td>
                      <td className="px-6 py-3">{formatMZN(Number(s.valor))}</td>
                      <td className={`px-6 py-3 font-medium ${statusColors[s.status] || ""}`}>{statusLabels[s.status] || s.status}</td>
                      <td className="px-6 py-3 text-muted-foreground">{s.utm_source || "-"}</td>
                      <td className="px-6 py-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Finances;
