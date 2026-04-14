import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Eye, ShoppingBag, XCircle, Calendar } from "lucide-react";
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
import { format, subDays, startOfDay, isAfter, isBefore } from "date-fns";

type DateRange = { from: Date; to: Date };
type FilterPreset = "today" | "7d" | "30d" | "custom";

const COLORS = ["hsl(160,84%,39%)", "hsl(200,80%,50%)", "hsl(40,90%,55%)", "hsl(280,60%,55%)", "hsl(350,70%,55%)"];

const Dashboard = () => {
  const { user } = useAuth();
  const [allSales, setAllSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<FilterPreset>("30d");
  const [customRange, setCustomRange] = useState<DateRange>({ from: subDays(new Date(), 30), to: new Date() });

  const dateRange: DateRange = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case "today": return { from: startOfDay(now), to: now };
      case "7d": return { from: subDays(now, 7), to: now };
      case "30d": return { from: subDays(now, 30), to: now };
      case "custom": return customRange;
    }
  }, [preset, customRange]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: salesData } = await supabase
        .from("sales").select("*, products(nome)").eq("user_id", user.id).order("created_at", { ascending: false });
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

  const totalLifetimeRevenue = useMemo(() => {
    return allSales.filter((s) => s.status === "approved").reduce((acc, s) => acc + Number(s.valor), 0);
  }, [allSales]);

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
      const key = format(new Date(s.created_at), "dd/MM");
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

  const statCards = [
    { label: "Receita total", value: formatMZN(stats.receita), icon: DollarSign },
    { label: "Vendas", value: stats.vendas.toString(), icon: ShoppingBag },
    { label: "Ticket médio", value: formatMZN(stats.ticket), icon: TrendingUp },
    { label: "Taxa de conversão", value: `${stats.conversao.toFixed(1)}%`, icon: Eye },
    { label: "Taxa de abandono", value: `${stats.abandono.toFixed(1)}%`, icon: XCircle },
  ];

  const presets: { label: string; value: FilterPreset }[] = [
    { label: "Hoje", value: "today" },
    { label: "7 dias", value: "7d" },
    { label: "30 dias", value: "30d" },
    { label: "Personalizado", value: "custom" },
  ];

  const tooltipFormatter = (value: number) => formatMZN(value);

  return (
    <DashboardLayout>
      <UserProgressHeader userName={userName || user?.email || ""} totalRevenue={totalLifetimeRevenue} />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {presets.map((p) => (
            <Button
              key={p.value}
              variant={preset === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
          {preset === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="mr-2 h-3 w-3" />
                  {format(customRange.from, "dd/MM")} - {format(customRange.to, "dd/MM")}
                </Button>
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

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {statCards.map((stat, i) => (
              <motion.div key={stat.label} className="rounded-xl border border-border/50 bg-card p-5 shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <stat.icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold">{stat.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h3 className="text-sm font-semibold mb-4">Vendas por dia</h3>
              {dailyData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160,84%,39%)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={tooltipFormatter} />
                    <Area type="monotone" dataKey="value" stroke="hsl(160,84%,39%)" fill="url(#colorRev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <motion.div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <h3 className="text-sm font-semibold mb-4">Origem (UTM Source)</h3>
              {utmSourceData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={utmSourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {utmSourceData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* Campaign performance */}
          {utmCampaignData.length > 0 && (
            <motion.div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.37 }}>
              <h3 className="text-sm font-semibold mb-4">Vendas por Campanha (UTM Campaign)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={utmCampaignData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(200,80%,50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Product performance */}
          {productData.length > 0 && (
            <motion.div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <h3 className="text-sm font-semibold mb-4">Performance por produto</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={productData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Bar dataKey="value" fill="hsl(160,84%,39%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Recent sales */}
          <motion.div className="rounded-xl border border-border/50 bg-card shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <div className="p-6 border-b border-border/50">
              <h3 className="text-sm font-semibold">Vendas recentes</h3>
            </div>
            {filteredSales.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhuma venda no período.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredSales.slice(0, 8).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-medium">{(sale.products as any)?.nome || "Produto"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatMZN(Number(sale.valor))}</p>
                      <span className={`text-xs font-medium ${sale.status === "approved" ? "text-primary" : sale.status === "pending" ? "text-yellow-600" : "text-destructive"}`}>
                        {sale.status === "approved" ? "Aprovado" : sale.status === "pending" ? "Pendente" : sale.status === "refunded" ? "Reembolsado" : sale.status}
                      </span>
                    </div>
                  </div>
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
