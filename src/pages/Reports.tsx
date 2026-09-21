import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { formatMZN } from "@/lib/currency";
import { exportCSV, exportPDF } from "@/lib/exportReports";
import { motion } from "framer-motion";
import {
  FileText, Download, BarChart3, Calendar, TrendingUp, Link2, Users,
  CreditCard, Globe, Package, Wallet, Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

type RangeKey = "7d" | "14d" | "30d" | "90d";

const PAYMENT_COLORS: Record<string, string> = {
  mpesa: "#ef4444",
  emola: "#f59e0b",
  mcx_express: "#f97316",
  multicaixa_express: "#f97316",
  referencia: "#3b82f6",
  paypay: "#10b981",
  default: "#6366f1",
};

const PAYMENT_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  mcx_express: "Express",
  multicaixa_express: "Express",
  referencia: "Referência Bancária",
  paypay: "PayPay",
};

const Reports = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("7d");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("sales").select("*, products!sales_product_id_fkey(nome)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").eq("user_id", user.id),
    ]).then(([s, w]) => {
      setSales(s.data || []);
      setWithdrawals(w.data || []);
      setLoading(false);
    });
  }, [user]);

  const { filtered, dateLabel, days } = useMemo(() => {
    const now = new Date();
    const map: Record<RangeKey, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };
    const d = map[range];
    const from = new Date(now.getTime() - d * 86400000);
    const f = sales.filter((s) => new Date(s.created_at) >= from);
    return { filtered: f, dateLabel: `Últimos ${d} dias`, days: d };
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
    { key: "14d", label: "14 dias" },
    { key: "30d", label: "30 dias" },
    { key: "90d", label: "90 dias" },
  ];

  // Daily performance chart
  const chartData = useMemo(() => {
    const buckets: Record<string, number> = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = 0;
    }
    filtered
      .filter((s) => s.status === "approved")
      .forEach((s) => {
        const d = new Date(s.created_at);
        const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (buckets[key] !== undefined) buckets[key]++;
      });
    return Object.entries(buckets).map(([date, vendas]) => ({ date, vendas }));
  }, [filtered, days]);

  // Financial summary
  const financial = useMemo(() => {
    const totalSaques = withdrawals
      .filter((w) => w.status === "approved" || w.status === "completed" || w.status === "paid")
      .reduce((a, w) => a + Number(w.valor || 0), 0);
    const saldoDisponivel = stats.receita - totalSaques;
    return { totalSaques, saldoDisponivel };
  }, [withdrawals, stats.receita]);

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { nome: string; vendas: number; receita: number }>();
    filtered
      .filter((s) => s.status === "approved")
      .forEach((s) => {
        const nome = (s.products as any)?.nome || "Produto";
        const cur = map.get(nome) || { nome, vendas: 0, receita: 0 };
        cur.vendas++;
        cur.receita += Number(s.valor);
        map.set(nome, cur);
      });
    return Array.from(map.values()).sort((a, b) => b.receita - a.receita).slice(0, 5);
  }, [filtered]);

  // Payment channels
  const channels = useMemo(() => {
    const map = new Map<string, { method: string; count: number; total: number }>();
    filtered
      .filter((s) => s.status === "approved")
      .forEach((s) => {
        const m = (s.payment_method || s.gateway || "default").toLowerCase();
        const cur = map.get(m) || { method: m, count: 0, total: 0 };
        cur.count++;
        cur.total += Number(s.valor);
        map.set(m, cur);
      });
    const arr = Array.from(map.values());
    const sum = arr.reduce((a, c) => a + c.total, 0) || 1;
    return arr
      .map((c) => ({ ...c, pct: (c.total / sum) * 100 }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Traffic sources
  const sources = useMemo(() => {
    const map = new Map<string, number>();
    filtered
      .filter((s) => s.status === "approved")
      .forEach((s) => {
        const src = s.utm_source || "Direto";
        map.set(src, (map.get(src) || 0) + 1);
      });
    return Array.from(map.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filtered]);

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Relatórios
          </h1>
          <p className="text-sm text-muted-foreground">Acompanhe o desempenho da sua loja</p>
        </div>

        {/* Top row: 2 highlighted cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Minhas Vendas Indiretas</div>
              <div className="text-2xl font-bold mt-1">{formatMZN(0)}</div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Vendas por Afiliados (Meu Produto)</div>
              <div className="text-2xl font-bold mt-1">{formatMZN(0)}</div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        {/* Stats row: 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Receita Total</div>
                <div className="text-2xl font-bold mt-1">{formatMZN(stats.receita)}</div>
                <div className="mt-2 inline-block text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {stats.vendas} vendas no período
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Vendas do Período</div>
                <div className="text-2xl font-bold mt-1">{stats.vendas}</div>
                <div className="mt-2 inline-block text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {dateLabel}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Comissões Pagas</div>
                <div className="text-2xl font-bold mt-1">{formatMZN(0)}</div>
                <div className="mt-2 inline-block text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  Em breve
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Range selector */}
        <div className="flex flex-wrap gap-2">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                range === r.key
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Performance chart */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            Performance de Vendas ({dateLabel})
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial + Top products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <Receipt className="h-4 w-4 text-primary" />
              Relatório Financeiro
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="text-muted-foreground">Receita Total</span>
                <span className="font-semibold">{formatMZN(stats.receita)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="text-muted-foreground">Saques Realizados</span>
                <span className="font-semibold">{formatMZN(financial.totalSaques)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-muted-foreground">Saldo Disponível</span>
                <span className="font-bold text-primary">{formatMZN(financial.saldoDisponivel)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-primary" />
              Produtos Mais Vendidos
            </h2>
            {topProducts.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Sem vendas no período</div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, idx) => (
                  <div key={p.nome} className="flex items-center gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{p.nome}</div>
                      <div className="text-xs text-muted-foreground">{p.vendas} vendas</div>
                    </div>
                    <div className="font-semibold text-sm">{formatMZN(p.receita)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment channels + Traffic sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-primary" />
              Canais de Pagamento
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Distribuição do volume transacionado por método.</p>
            {channels.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Sem dados no período</div>
            ) : (
              <div className="space-y-4">
                {channels.map((c) => {
                  const color = PAYMENT_COLORS[c.method] || PAYMENT_COLORS.default;
                  const label = PAYMENT_LABELS[c.method] || c.method;
                  return (
                    <div key={c.method}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-8 rounded-full" style={{ background: color }} />
                          <div>
                            <div className="text-sm font-medium">{label}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {c.count} transacções
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{formatMZN(c.total)}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-primary/15 text-primary font-semibold">
                            {c.pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${c.pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-primary" />
              Fontes de Tráfego
            </h2>
            {sources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Globe className="h-10 w-10 mb-2 opacity-40" />
                <div className="text-sm">Em breve</div>
              </div>
            ) : (
              <div className="space-y-3">
                {sources.map((s) => (
                  <div key={s.source} className="flex items-center justify-between pb-3 border-b border-border last:border-0 last:pb-0">
                    <span className="text-sm capitalize">{s.source}</span>
                    <span className="text-sm font-semibold">{s.count} vendas</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Export */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold mb-1">Exportar relatório</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {dateLabel} · {filtered.length} registos
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