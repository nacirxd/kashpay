import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Eye, ShoppingBag, XCircle, Calendar, ArrowUpRight, ArrowDownRight, CreditCard, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { formatMZN } from "@/lib/currency";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, subDays, addDays, isAfter, isBefore } from "date-fns";
import { toMozambiqueDate, formatDateMZ } from "@/lib/timezone";

type DateRange = { from: Date; to: Date };
type FilterPreset = "all" | "today" | "7d" | "30d" | "custom";

const COLORS = ["hsl(160,84%,39%)", "hsl(200,80%,50%)", "hsl(40,90%,55%)", "hsl(280,60%,55%)", "hsl(350,70%,55%)"];

const Dashboard = () => {
  const { user } = useAuth();
  const [allSales, setAllSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<FilterPreset>("all");
  const [customRange, setCustomRange] = useState<DateRange>({ from: subDays(new Date(), 30), to: new Date() });

  const dateRange: DateRange = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case "all": return { from: new Date(0), to: addDays(now, 1) };
      case "today": {
        const mzNow = toMozambiqueDate(now);
        const startMZ = new Date(mzNow);
        startMZ.setHours(0, 0, 0, 0);
        const endMZ = new Date(mzNow);
        endMZ.setHours(23, 59, 59, 999);
        // Convert back: offset between local start-of-day in MZ and UTC
        const offsetMs = now.getTime() - mzNow.getTime();
        return {
          from: new Date(startMZ.getTime() + offsetMs),
          to: new Date(endMZ.getTime() + offsetMs),
        };
      }
      case "7d": return { from: subDays(now, 7), to: addDays(now, 1) };
      case "30d": return { from: subDays(now, 30), to: addDays(now, 1) };
      case "custom": return customRange;
    }
  }, [preset, customRange]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: salesData } = await supabase
        .from("sales").select("*, products!sales_product_id_fkey(nome)").eq("user_id", user.id).order("created_at", { ascending: false });
      setAllSales(salesData || []);
      setLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel("dashboard-sales")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales", filter: `user_id=eq.${user.id}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filteredSales = useMemo(() => {
    return allSales.filter((s) => {
      const d = new Date(s.created_at);
      return !isBefore(d, dateRange.from) && !isAfter(d, dateRange.to);
    });
  }, [allSales, dateRange]);

  const stats = useMemo(() => {
    const approved = filteredSales.filter((s) => s.status === "approved");
    const receita = approved.reduce((acc, s) => acc + Number(s.valor), 0);
    const vendas = approved.length;
    const ticket = vendas > 0 ? receita / vendas : 0;
    const conversao = filteredSales.length > 0 ? (vendas / filteredSales.length) * 100 : 0;
    const abandono = filteredSales.length > 0 ? ((filteredSales.length - vendas) / filteredSales.length) * 100 : 0;
    return { receita, vendas, ticket, conversao, abandono };
  }, [filteredSales]);

  const dailyData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.filter((s) => s.status === "approved").forEach((s) => {
      const key = formatDateMZ(s.created_at, { day: "2-digit", month: "2-digit" });
      map[key] = (map[key] || 0) + Number(s.valor);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  const utmSourceData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.filter((s) => s.status === "approved").forEach((s) => {
      const src = s.utm_source || "Direto";
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  const utmCampaignData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.filter((s) => s.status === "approved").forEach((s) => {
      if (!s.utm_campaign) return;
      map[s.utm_campaign] = (map[s.utm_campaign] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredSales]);

  const productData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.filter((s) => s.status === "approved").forEach((s) => {
      const pName = (s.products as any)?.nome || "Produto";
      map[pName] = (map[pName] || 0) + Number(s.valor);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredSales]);

  const PAYMENT_LABELS: Record<string, string> = {
    mpesa: "M-Pesa",
    emola: "e-Mola",
    referencia: "Referência Bancária",
    multicaixa_express: "Express",
    mcx_express: "Express",
    paypay: "PayPay",
  };
  const PAYMENT_COLORS: Record<string, string> = {
    mpesa: "#ef4444",
    emola: "#f59e0b",
    referencia: "#3b82f6",
    multicaixa_express: "#f97316",
    mcx_express: "#f97316",
    paypay: "#10b981",
    default: "#6366f1",
  };

  const paymentChannels = useMemo(() => {
    const map = new Map<string, { method: string; count: number; total: number }>();
    filteredSales.filter((s) => s.status === "approved").forEach((s) => {
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
  }, [filteredSales]);

  const statCards = [
    { label: "Receita total", value: formatMZN(stats.receita), icon: DollarSign, accent: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { label: "Vendas", value: stats.vendas.toString(), icon: ShoppingBag, accent: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-500" },
    { label: "Ticket médio", value: formatMZN(stats.ticket), icon: TrendingUp, accent: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-500" },
    { label: "Conversão", value: `${stats.conversao.toFixed(1)}%`, icon: Eye, accent: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-500", good: stats.conversao > 50 },
    { label: "Abandono", value: `${stats.abandono.toFixed(1)}%`, icon: XCircle, accent: "from-destructive/20 to-destructive/5", iconColor: "text-destructive", good: stats.abandono < 50 },
  ];

  const presets: { label: string; value: FilterPreset }[] = [
    { label: "Todas", value: "all" },
    { label: "Hoje", value: "today" },
    { label: "7 dias", value: "7d" },
    { label: "30 dias", value: "30d" },
    { label: "Personalizado", value: "custom" },
  ];

  const tooltipFormatter = (value: number) => formatMZN(value);

  const CustomTooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.75rem",
    padding: "8px 12px",
    fontSize: "12px",
    color: "hsl(var(--foreground))",
    boxShadow: "var(--shadow-elevated)",
  };

  return (
    <DashboardLayout>
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do seu negócio
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-xl p-1">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                preset === p.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
          {preset === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-background shadow-sm text-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(customRange.from, "dd/MM")} – {format(customRange.to, "dd/MM")}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarWidget
                  mode="range"
                  selected={{ from: customRange.from, to: customRange.to }}
                  onSelect={(range: any) => {
                    if (range?.from && range?.to) setCustomRange({ from: range.from, to: range.to });
                  }}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 shadow-soft group hover:shadow-card transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                {/* Gradient accent bg */}
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", stat.accent)} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                    <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", stat.iconColor, "bg-background/80 shadow-sm")}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              className="lg:col-span-2 rounded-2xl border border-border/40 bg-card p-6 shadow-soft"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-semibold">Receita por dia</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Evolução das vendas aprovadas</p>
                </div>
              </div>
              {dailyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <DollarSign className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Sem dados no período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(160,84%,39%)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={tooltipFormatter} contentStyle={CustomTooltipStyle} />
                    <Area type="monotone" dataKey="value" stroke="hsl(160,84%,39%)" fill="url(#colorRev)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "hsl(160,84%,39%)", strokeWidth: 2, stroke: "hsl(var(--background))" }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <motion.div
              className="rounded-2xl border border-border/40 bg-card p-6 shadow-soft"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="mb-6">
                <h3 className="text-sm font-semibold">Origem do tráfego</h3>
                <p className="text-xs text-muted-foreground mt-0.5">UTM Source</p>
              </div>
              {utmSourceData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Eye className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Sem dados no período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={utmSourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                      {utmSourceData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={CustomTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* Campaign + Product row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {utmCampaignData.length > 0 && (
              <motion.div
                className="rounded-2xl border border-border/40 bg-card p-6 shadow-soft"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.37 }}
              >
                <div className="mb-6">
                  <h3 className="text-sm font-semibold">Campanhas</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Vendas por campanha UTM</p>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={utmCampaignData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CustomTooltipStyle} />
                    <Bar dataKey="value" fill="hsl(200,80%,50%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Top produtos removed */}
          </div>

          {/* Payment channels + Financial summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              className="rounded-2xl border border-border/40 bg-card p-6 shadow-soft"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold">Canais de Pagamento</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-5 ml-11">Distribuição do volume transacionado por método.</p>
              {paymentChannels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Sem dados no período</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {paymentChannels.map((c) => {
                    const color = PAYMENT_COLORS[c.method] || PAYMENT_COLORS.default;
                    const label = PAYMENT_LABELS[c.method] || c.method;
                    return (
                      <div key={c.method}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-9 rounded-full" style={{ background: color }} />
                            <div>
                              <div className="text-sm font-semibold">{label}</div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {c.count} transacções
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{formatMZN(c.total)}</span>
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
            </motion.div>

            <motion.div
              className="rounded-2xl border border-border/40 bg-card p-6 shadow-soft"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44 }}
            >
              <h3 className="text-base font-semibold">Resumo Financeiro</h3>
              <p className="text-xs text-muted-foreground mb-5">Análise de receitas realizadas (apenas vendas completadas)</p>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Receita Total:</span>
                  <span className="font-bold">{formatMZN(stats.receita)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Receita Directa:</span>
                  <span className="font-bold text-primary">{formatMZN(stats.receita)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Venda Indirecta (Meus Afiliados):</span>
                  <span className="font-bold text-violet-500">{formatMZN(0)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Ganhos como Afiliado:</span>
                  <span className="font-bold text-primary">{formatMZN(0)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Comissões Pagas:</span>
                  <span className="font-bold text-destructive">-{formatMZN(0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Receita Líquida</div>
                      <div className="text-xs text-muted-foreground">Após deduções de comissões</div>
                    </div>
                  </div>
                  <span className="font-bold text-base">{formatMZN(stats.receita)}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Recent sales */}
          <motion.div
            className="rounded-2xl border border-border/40 bg-card shadow-soft overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <div className="p-6 pb-4">
              <h3 className="text-sm font-semibold">Vendas recentes</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Últimas transações registadas</p>
            </div>
            {filteredSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingBag className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Nenhuma venda no período</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {filteredSales.slice(0, 8).map((sale, i) => (
                  <motion.div
                    key={sale.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.03 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold",
                        sale.status === "approved" ? "bg-primary/10 text-primary" : sale.status === "pending" ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"
                      )}>
                        {sale.status === "approved" ? <ArrowUpRight className="h-4 w-4" /> : sale.status === "pending" ? <DollarSign className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{(sale.products as any)?.nome || "Produto"}</p>
                        <p className="text-xs text-muted-foreground">{formatDateMZ(sale.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatMZN(Number(sale.valor))}</p>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        sale.status === "approved" ? "bg-primary/10 text-primary" : sale.status === "pending" ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"
                      )}>
                        {sale.status === "approved" ? "Aprovado" : sale.status === "pending" ? "Pendente" : sale.status === "refunded" ? "Reembolsado" : sale.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
