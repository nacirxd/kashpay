import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { formatMZN } from "@/lib/currency";
import { exportCSV, exportPDF } from "@/lib/exportReports";
import { motion } from "framer-motion";
import { FileText, Download, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

type RangeKey = "7d" | "30d" | "90d" | "all";

const Reports = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("30d");

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

  const { filtered, dateLabel } = useMemo(() => {
    const now = new Date();
    let from: Date | null = null;
    let label = "Todo o período";
    if (range === "7d") {
      from = new Date(now.getTime() - 7 * 86400000);
      label = "Últimos 7 dias";
    } else if (range === "30d") {
      from = new Date(now.getTime() - 30 * 86400000);
      label = "Últimos 30 dias";
    } else if (range === "90d") {
      from = new Date(now.getTime() - 90 * 86400000);
      label = "Últimos 90 dias";
    }
    const f = from
      ? sales.filter((s) => new Date(s.created_at) >= from!)
      : sales;
    return { filtered: f, dateLabel: label };
  }, [sales, range]);

  const stats = useMemo(() => {
    const approved = filtered.filter((s) => s.status === "approved");
    const receita = approved.reduce((a, s) => a + Number(s.valor), 0);
    const vendas = approved.length;
    const ticket = vendas > 0 ? receita / vendas : 0;
    const conversao = filtered.length > 0 ? (vendas / filtered.length) * 100 : 0;
    const abandono = filtered.length > 0 ? ((filtered.length - vendas) / filtered.length) * 100 : 0;
    return { receita, vendas, ticket, conversao, abandono };
  }, [filtered]);

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
    { key: "90d", label: "90 dias" },
    { key: "all", label: "Tudo" },
  ];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Relatórios
            </h1>
            <p className="text-sm text-muted-foreground">Exporte relatórios das suas vendas em CSV ou PDF.</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="flex rounded-lg border border-border bg-background overflow-hidden">
              {ranges.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    range === r.key ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Receita", value: formatMZN(stats.receita) },
            { label: "Vendas", value: stats.vendas.toString() },
            { label: "Ticket médio", value: formatMZN(stats.ticket) },
            { label: "Conversão", value: `${stats.conversao.toFixed(1)}%` },
            { label: "Abandono", value: `${stats.abandono.toFixed(1)}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</div>
              <div className="text-lg font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-1">Exportar relatório</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Período selecionado: <span className="font-medium text-foreground">{dateLabel}</span> ·{" "}
            {filtered.length} registos
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => exportCSV(filtered, dateLabel)}
              disabled={loading || filtered.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button
              onClick={() => exportPDF(filtered, stats, dateLabel)}
              disabled={loading || filtered.length === 0}
              className="gap-2"
            >
              <FileText className="h-4 w-4" /> Exportar PDF
            </Button>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Reports;