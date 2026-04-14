import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Eye, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ receita: 0, vendas: 0, ticket: 0, conversao: 0 });
  const [revenueData, setRevenueData] = useState<{ name: string; value: number }[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: sales } = await supabase
        .from("sales")
        .select("*, products(nome)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (sales) {
        const approved = sales.filter((s) => s.status === "approved");
        const receita = approved.reduce((acc, s) => acc + Number(s.valor), 0);
        const vendas = approved.length;
        const ticket = vendas > 0 ? receita / vendas : 0;
        setStats({ receita, vendas, ticket, conversao: sales.length > 0 ? (vendas / sales.length) * 100 : 0 });
        setRecentSales(sales.slice(0, 5));

        // Group by month
        const monthly: Record<string, number> = {};
        approved.forEach((s) => {
          const d = new Date(s.created_at);
          const key = d.toLocaleString("pt-BR", { month: "short" });
          monthly[key] = (monthly[key] || 0) + Number(s.valor);
        });
        setRevenueData(Object.entries(monthly).map(([name, value]) => ({ name, value })));
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const statCards = [
    { label: "Receita total", value: `R$ ${stats.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign },
    { label: "Vendas", value: stats.vendas.toString(), icon: ShoppingBag },
    { label: "Ticket médio", value: `R$ ${stats.ticket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: TrendingUp },
    { label: "Taxa de conversão", value: `${stats.conversao.toFixed(1)}%`, icon: Eye },
  ];

  return (
    <DashboardLayout>
      <h1 className="text-lg font-semibold mb-6">Dashboard</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <motion.div key={stat.label} className="rounded-xl border border-border/50 bg-card p-6 shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <stat.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </motion.div>
            ))}
          </div>

          {revenueData.length > 0 && (
            <motion.div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <h3 className="text-sm font-semibold mb-6">Receita mensal</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="hsl(160, 84%, 39%)" fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          <motion.div className="rounded-xl border border-border/50 bg-card shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="p-6 border-b border-border/50">
              <h3 className="text-sm font-semibold">Vendas recentes</h3>
            </div>
            {recentSales.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhuma venda ainda.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-medium">{(sale.products as any)?.nome || "Produto"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">R$ {Number(sale.valor).toFixed(2)}</p>
                      <span className={`text-xs font-medium ${sale.status === "approved" ? "text-primary" : "text-muted-foreground"}`}>
                        {sale.status === "approved" ? "Aprovado" : sale.status === "pending" ? "Pendente" : sale.status}
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
