import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";

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

  return (
    <DashboardLayout>
      <h1 className="text-lg font-semibold mb-6">Finanças</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <motion.div className="rounded-xl border border-border/50 bg-card shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Nenhuma venda registrada.</td></tr>
                ) : sales.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-3 font-medium">{(s.products as any)?.nome || "-"}</td>
                    <td className="px-6 py-3">R$ {Number(s.valor).toFixed(2)}</td>
                    <td className={`px-6 py-3 font-medium ${statusColors[s.status] || ""}`}>{statusLabels[s.status] || s.status}</td>
                    <td className="px-6 py-3 text-muted-foreground">{s.utm_source || "-"}</td>
                    <td className="px-6 py-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  );
};

export default Finances;
