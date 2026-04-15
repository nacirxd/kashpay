import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { formatMZN } from "@/lib/currency";
import { exportCSV, exportPDF } from "@/lib/exportReports";
import { motion } from "framer-motion";
import { ShoppingCart, Download, FileText } from "lucide-react";

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("sales")
      .select("*, products(nome)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSales(data || []);
        setLoading(false);
      });
  }, [user]);

  const filtered = filter === "all" ? sales : sales.filter((s) => s.status === filter);

  const stats = useMemo(() => {
    const approved = filtered.filter((s) => s.status === "approved");
    const receita = approved.reduce((acc, s) => acc + Number(s.valor), 0);
    const vendas = approved.length;
    const ticket = vendas > 0 ? receita / vendas : 0;
    const conversao = filtered.length > 0 ? (vendas / filtered.length) * 100 : 0;
    const abandono = filtered.length > 0 ? ((filtered.length - vendas) / filtered.length) * 100 : 0;
    return { receita, vendas, ticket, conversao, abandono };
  }, [filtered]);

  const statusLabels: Record<string, string> = {
    approved: "Aprovado",
    pending: "Pendente",
    refunded: "Reembolsado",
    chargeback: "Chargeback",
  };

  const statusColors: Record<string, string> = {
    approved: "text-primary",
    pending: "text-yellow-600",
    refunded: "text-orange-500",
    chargeback: "text-destructive",
  };

  const counts = {
    all: sales.length,
    approved: sales.filter((s) => s.status === "approved").length,
    pending: sales.filter((s) => s.status === "pending").length,
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-lg font-semibold">Vendas</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => exportCSV(filtered, "vendas")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title="Exportar CSV"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={() => exportPDF(filtered, stats, "Todas as vendas")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title="Imprimir/PDF"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filter tabs */}
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit">
            {([
              { key: "all", label: "Todas" },
              { key: "approved", label: "Aprovadas" },
              { key: "pending", label: "Pendentes" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-60">({counts[tab.key]})</span>
              </button>
            ))}
          </div>

          <motion.div
            className="rounded-xl border border-border/50 bg-card shadow-soft"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Produto</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Valor</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Data / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhuma venda encontrada.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 font-medium">{s.buyer_name || "-"}</td>
                        <td className="px-6 py-3 text-muted-foreground">{s.buyer_email || "-"}</td>
                        <td className="px-6 py-3">{(s.products as any)?.nome || "-"}</td>
                        <td className="px-6 py-3 font-medium">{formatMZN(Number(s.valor))}</td>
                        <td className={`px-6 py-3 font-medium ${statusColors[s.status] || ""}`}>
                          {statusLabels[s.status] || s.status}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString("pt-BR")}{" "}
                          {new Date(s.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Sales;
