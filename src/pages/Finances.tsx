import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { formatMZN } from "@/lib/currency";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Clock, AlertTriangle, Wallet, Send, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const Finances = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"resumo" | "saque">("resumo");
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  // Withdraw form
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState("mpesa");
  const [conta, setConta] = useState("");
  const [nomeConta, setNomeConta] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Saved payment info from profile
  const [paymentInfo, setPaymentInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("sales").select("*, products(nome)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("mpesa_nome, mpesa_telefone, emola_nome, emola_telefone, banco_nome, banco_conta").eq("user_id", user.id).single(),
    ]).then(([salesRes, withdrawRes, profileRes]) => {
      setSales(salesRes.data || []);
      setWithdrawals(withdrawRes.data || []);
      if (profileRes.data) {
        const p = profileRes.data as any;
        setPaymentInfo({
          mpesa_nome: p.mpesa_nome || "",
          mpesa_telefone: p.mpesa_telefone || "",
          emola_nome: p.emola_nome || "",
          emola_telefone: p.emola_telefone || "",
          banco_nome: p.banco_nome || "",
          banco_conta: p.banco_conta || "",
        });
      }
      setLoading(false);
    });
  }, [user]);

  // Pre-fill form when method changes or payment info loads
  useEffect(() => {
    if (metodo === "mpesa") {
      setNomeConta(paymentInfo.mpesa_nome || "");
      setConta(paymentInfo.mpesa_telefone || "");
    } else if (metodo === "emola") {
      setNomeConta(paymentInfo.emola_nome || "");
      setConta(paymentInfo.emola_telefone || "");
    } else {
      setNomeConta(paymentInfo.banco_nome || "");
      setConta(paymentInfo.banco_conta || "");
    }
  }, [metodo, paymentInfo]);

  const summary = useMemo(() => {
    const now = Date.now();
    const H24 = 24 * 60 * 60 * 1000;
    const approved = sales.filter((s) => s.status === "approved");
    const pending = sales.filter((s) => s.status === "pending");
    const refunded = sales.filter((s) => s.status === "refunded" || s.status === "chargeback");

    // Approved sales older than 24h are available; within 24h are held
    const availableApproved = approved.filter((s) => now - new Date(s.created_at).getTime() >= H24);
    const heldApproved = approved.filter((s) => now - new Date(s.created_at).getTime() < H24);

    const totalAvailable = availableApproved.reduce((a, s) => a + Number(s.valor), 0);
    const totalHeld = heldApproved.reduce((a, s) => a + Number(s.valor), 0);
    const totalWithdrawn = withdrawals
      .filter((w) => w.status === "aprovado" || w.status === "pago")
      .reduce((a, w) => a + Number(w.valor), 0);
    const pendingWithdraw = withdrawals
      .filter((w) => w.status === "pendente")
      .reduce((a, w) => a + Number(w.valor), 0);
    return {
      saldo: totalAvailable - totalWithdrawn - pendingWithdraw,
      pendente: pending.reduce((a, s) => a + Number(s.valor), 0) + totalHeld,
      reembolsado: refunded.reduce((a, s) => a + Number(s.valor), 0),
      total: sales.length,
      pendingWithdraw,
    };
  }, [sales, withdrawals]);

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

  const withdrawStatusLabels: Record<string, string> = {
    pendente: "Pendente",
    aprovado: "Aprovado",
    pago: "Pago",
    rejeitado: "Rejeitado",
  };

  const withdrawStatusColors: Record<string, string> = {
    pendente: "text-yellow-600",
    aprovado: "text-blue-500",
    pago: "text-primary",
    rejeitado: "text-destructive",
  };

  const summaryCards = [
    { label: "Saldo disponível", value: formatMZN(summary.saldo), icon: DollarSign, color: "text-primary" },
    { label: "Pendente", value: formatMZN(summary.pendente), icon: Clock, color: "text-yellow-600" },
    { label: "Reembolsado", value: formatMZN(summary.reembolsado), icon: AlertTriangle, color: "text-orange-500" },
    { label: "Total transações", value: summary.total.toString(), icon: TrendingUp, color: "text-foreground" },
  ];

  const handleWithdraw = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    if (!user) return false;

    const amount = parseFloat(valor);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Informe um valor válido.");
      return false;
    }
    if (amount > summary.saldo) {
      toast.error("Saldo insuficiente.");
      return false;
    }
    if (!conta.trim()) {
      toast.error("Informe o número da conta.");
      return false;
    }
    if (!nomeConta.trim()) {
      toast.error("Informe o nome do titular.");
      return false;
    }

    setSubmitting(true);

    // Save payment info to profile
    const profileUpdate: Record<string, string> = {};
    if (metodo === "mpesa") {
      profileUpdate.mpesa_nome = nomeConta.trim();
      profileUpdate.mpesa_telefone = conta.trim();
    } else if (metodo === "emola") {
      profileUpdate.emola_nome = nomeConta.trim();
      profileUpdate.emola_telefone = conta.trim();
    } else {
      profileUpdate.banco_nome = nomeConta.trim();
      profileUpdate.banco_conta = conta.trim();
    }
    await supabase.from("profiles").update(profileUpdate).eq("user_id", user.id);
    setPaymentInfo((prev) => ({ ...prev, ...profileUpdate }));

    const { error, data } = await supabase.from("withdrawals").insert({
      user_id: user.id,
      valor: amount,
      metodo,
      conta: conta.trim(),
    }).select().single();
    setSubmitting(false);

    if (error) {
      toast.error("Erro ao solicitar saque.");
      return false;
    } else {
      toast.success("Pedido de saque enviado!");
      setWithdrawals((prev) => [data, ...prev]);
      setValor("");
      setShowWithdrawForm(false);
      return true;
    }
  };

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

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit">
            <button
              onClick={() => setActiveTab("resumo")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "resumo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
              Resumo
            </button>
            <button
              onClick={() => setActiveTab("saque")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "saque" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wallet className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
              Saque
            </button>
          </div>

          {activeTab === "resumo" && (
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
          )}

          {activeTab === "saque" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={showWithdrawForm} onOpenChange={setShowWithdrawForm}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Solicitar saque
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-primary" />
                        Solicitar saque
                      </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                      Saldo disponível: <span className="font-semibold text-foreground">{formatMZN(summary.saldo)}</span>
                    </p>
                    <form onSubmit={handleWithdraw} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="valor">Valor (MT)</Label>
                        <Input id="valor" type="number" min="1" step="0.01" placeholder="Ex: 5000" value={valor} onChange={(e) => setValor(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="metodo">Método</Label>
                        <select id="metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <option value="mpesa">M-Pesa</option>
                          <option value="emola">e-Mola</option>
                          <option value="banco">Conta Bancária</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="conta">{metodo === "banco" ? "Número da conta (IBAN)" : "Número de telefone"}</Label>
                        <Input id="conta" placeholder={metodo === "banco" ? "Ex: 00001234567890" : "Ex: 84 123 4567"} value={conta} onChange={(e) => setConta(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting || summary.saldo <= 0}>
                        {submitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <><Wallet className="mr-2 h-4 w-4" /> Solicitar saque</>}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <motion.div className="rounded-xl border border-border/50 bg-card shadow-soft" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Valor</th>
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Método</th>
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Conta</th>
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {withdrawals.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Nenhum saque solicitado.</td></tr>
                      ) : withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-3 font-medium">{formatMZN(Number(w.valor))}</td>
                          <td className="px-6 py-3 capitalize">{w.metodo === "mpesa" ? "M-Pesa" : w.metodo === "emola" ? "e-Mola" : "Banco"}</td>
                          <td className="px-6 py-3 text-muted-foreground">{w.conta}</td>
                          <td className={`px-6 py-3 font-medium ${withdrawStatusColors[w.status] || ""}`}>{withdrawStatusLabels[w.status] || w.status}</td>
                          <td className="px-6 py-3 text-muted-foreground">{new Date(w.created_at).toLocaleDateString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Finances;
