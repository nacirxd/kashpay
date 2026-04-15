import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { formatMZN } from "@/lib/currency";
import { exportCSV, exportPDF } from "@/lib/exportReports";
import { motion } from "framer-motion";
import { ShoppingCart, Download, FileText, Eye, X, Phone, Mail, User, CreditCard, Calendar, Package, Hash, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [search, setSearch] = useState("");

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

  const byStatus = filter === "all" ? sales : sales.filter((s) => s.status === filter);

  const filtered = useMemo(() => {
    if (!search.trim()) return byStatus;
    const q = search.toLowerCase().trim();
    return byStatus.filter((s) =>
      (s.buyer_name || "").toLowerCase().includes(q) ||
      (s.buyer_email || "").toLowerCase().includes(q) ||
      (s.buyer_whatsapp || "").toLowerCase().includes(q)
    );
  }, [byStatus, search]);

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
    approved: "bg-primary/10 text-primary",
    pending: "bg-yellow-500/10 text-yellow-600",
    refunded: "bg-orange-500/10 text-orange-500",
    chargeback: "bg-destructive/10 text-destructive",
  };

  const counts = {
    all: sales.length,
    approved: sales.filter((s) => s.status === "approved").length,
    pending: sales.filter((s) => s.status === "pending").length,
  };

  const methodLabels: Record<string, string> = {
    mpesa: "M-Pesa",
    emola: "e-Mola",
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
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">WhatsApp</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Produto</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Valor</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Data</th>
                    <th className="px-6 py-3 text-center font-medium text-muted-foreground">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhuma venda encontrada.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 font-medium">{s.buyer_name || "-"}</td>
                        <td className="px-6 py-3 text-muted-foreground">{s.buyer_whatsapp || "-"}</td>
                        <td className="px-6 py-3">{(s.products as any)?.nome || "-"}</td>
                        <td className="px-6 py-3 font-medium">{formatMZN(Number(s.valor))}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || ""}`}>
                            {statusLabels[s.status] || s.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => setSelectedSale(s)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
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

      {/* Detail Sheet */}
      <Sheet open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da venda</SheetTitle>
          </SheetHeader>

          {selectedSale && (
            <div className="mt-6 space-y-5">
              {/* Status badge */}
              <div className="flex justify-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusColors[selectedSale.status] || ""}`}>
                  {statusLabels[selectedSale.status] || selectedSale.status}
                </span>
              </div>

              {/* Client info */}
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</h3>
                <DetailRow icon={User} label="Nome" value={selectedSale.buyer_name} />
                <DetailRow icon={Mail} label="Email" value={selectedSale.buyer_email} />
                <DetailRow icon={Phone} label="WhatsApp" value={selectedSale.buyer_whatsapp} />
              </div>

              {/* Product info */}
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produto</h3>
                <DetailRow icon={Package} label="Produto" value={(selectedSale.products as any)?.nome} />
                <DetailRow icon={Hash} label="Valor" value={formatMZN(Number(selectedSale.valor))} highlight />
              </div>

              {/* Payment info */}
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pagamento</h3>
                <DetailRow icon={CreditCard} label="Método" value={methodLabels[selectedSale.payment_method] || selectedSale.payment_method} />
                <DetailRow icon={Phone} label="Nº pagamento" value={selectedSale.payment_phone} />
              </div>

              {/* Date & UTMs */}
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rastreamento</h3>
                <DetailRow icon={Calendar} label="Data / Hora" value={
                  `${new Date(selectedSale.created_at).toLocaleDateString("pt-BR")} ${new Date(selectedSale.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                } />
                {selectedSale.utm_source && <DetailRow label="UTM Source" value={selectedSale.utm_source} />}
                {selectedSale.utm_medium && <DetailRow label="UTM Medium" value={selectedSale.utm_medium} />}
                {selectedSale.utm_campaign && <DetailRow label="UTM Campaign" value={selectedSale.utm_campaign} />}
                {selectedSale.utm_content && <DetailRow label="UTM Content" value={selectedSale.utm_content} />}
              </div>

              {/* Sale ID */}
              <p className="text-xs text-muted-foreground/50 text-center font-mono break-all">
                ID: {selectedSale.id}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

const DetailRow = ({ icon: Icon, label, value, highlight }: { icon?: any; label: string; value?: string | null; highlight?: boolean }) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 text-muted-foreground">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span className="text-xs">{label}</span>
    </div>
    <span className={`text-sm font-medium truncate max-w-[180px] ${highlight ? "text-primary" : ""}`}>
      {value || "-"}
    </span>
  </div>
);

export default Sales;
