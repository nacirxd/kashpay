import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import { MessageSquare, Send, RefreshCw, Trash2, Pause, Play } from "lucide-react";

type Tpl = { id: string; nome: string; evento: string; mensagem: string; ativo: boolean; created_at: string; seller_name: string; seller_email: string; product_names: string[] };

type SmsLog = {
  id: string;
  recipient_phone: string;
  message: string;
  status: string;
  provider_response: string | null;
  error_message: string | null;
  sender_id: string | null;
  created_at: string;
  seller_name: string;
  seller_email: string;
};

const AdminSms = () => {
  const { adminFetch } = useAdmin();
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("Teste de SMS KashPay - integracao Tsemba ativa.");
  const [sending, setSending] = useState(false);
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [sellerFilter, setSellerFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch("list_sms_logs");
      setLogs(data || []);
      const t = await adminFetch("list_sms_templates");
      setTpls(t || []);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleTest = async () => {
    if (!testPhone) { toast.error("Insira um número"); return; }
    setSending(true);
    try {
      const data = await adminFetch("send_test_sms", { phone: testPhone, message: testMsg });
      if (data?.success) toast.success(`SMS enviado para ${data.phone}`);
      else toast.error("Falha ao enviar SMS");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSending(false);
  };

  const toggleTpl = async (t: Tpl) => {
    try { await adminFetch("toggle_sms_template", { id: t.id, ativo: !t.ativo }); load(); } catch (e: any) { toast.error(e.message); }
  };
  const deleteTpl = async (t: Tpl) => {
    if (!confirm("Remover este modelo?")) return;
    try { await adminFetch("delete_sms_template", { id: t.id }); toast.success("Modelo removido"); load(); } catch (e: any) { toast.error(e.message); }
  };
  const f = sellerFilter.toLowerCase();
  const fTpls = tpls.filter(t => !f || t.seller_name.toLowerCase().includes(f) || t.seller_email.toLowerCase().includes(f));
  const fLogs = logs.filter(l => !f || l.seller_name.toLowerCase().includes(f) || l.seller_email.toLowerCase().includes(f));

  const sentCount = logs.filter(l => l.status === "sent").length;
  const failedCount = logs.filter(l => l.status !== "sent").length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Disparos SMS</h1>
          <p className="text-sm text-gray-500">Monitorização completa: modelos de todos os vendedores e histórico de envios (mesma API e instância para todos).</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-gray-800 bg-[#13151d] p-4">
          <p className="text-xs text-gray-500">Modelos ativos</p>
          <p className="text-2xl font-bold text-gray-100">{tpls.filter(t => t.ativo).length}<span className="text-sm text-gray-500"> / {tpls.length}</span></p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-[#13151d] p-4">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-100">{logs.length}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-[#13151d] p-4">
          <p className="text-xs text-gray-500">Enviados</p>
          <p className="text-2xl font-bold text-emerald-400">{sentCount}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-[#13151d] p-4">
          <p className="text-xs text-gray-500">Falhas</p>
          <p className="text-2xl font-bold text-red-400">{failedCount}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#13151d] p-6 mb-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-100">Enviar SMS de teste</h2>
            <p className="text-xs text-gray-500">Usa as credenciais TSEMBA_API_KEY / TSEMBA_SENDER_ID dos secrets.</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Telefone (MZ)</label>
            <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="84xxxxxxx ou +258 84xxxxxxx" className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Mensagem</label>
            <textarea value={testMsg} onChange={(e) => setTestMsg(e.target.value)} rows={2} className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100" />
          </div>
          <button onClick={handleTest} disabled={sending} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
            <Send className="h-4 w-4" /> {sending ? "Enviando..." : "Enviar teste"}
          </button>
        </div>
      </div>

      <input value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} placeholder="Filtrar por vendedor (nome ou email)" className="mb-4 w-full max-w-md rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100" />

      <div className="rounded-xl border border-gray-800 bg-[#13151d] overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-gray-100">Modelos de disparo dos vendedores ({fTpls.length})</h2>
        </div>
        {fTpls.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Nenhum modelo criado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-800/40">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Vendedor</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Modelo</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Evento</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Produtos</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Mensagem</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {fTpls.map((t) => (
                  <tr key={t.id} className={t.ativo ? "" : "opacity-50"}>
                    <td className="px-4 py-3"><div className="text-gray-200">{t.seller_name}</div><div className="text-gray-500">{t.seller_email}</div></td>
                    <td className="px-4 py-3 text-gray-300">{t.nome || "—"}</td>
                    <td className="px-4 py-3 text-gray-300">{t.evento === "approved" ? "Compra aprovada" : "Pedido não pago"}</td>
                    <td className="px-4 py-3 text-gray-400">{t.product_names.length ? t.product_names.join(", ") : "Todos"}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-md truncate" title={t.mensagem}>{t.mensagem}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => toggleTpl(t)} title={t.ativo ? "Pausar" : "Ativar"} className="rounded border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800">{t.ativo ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</button>
                        <button onClick={() => deleteTpl(t)} title="Remover" className="rounded border border-gray-700 p-1.5 text-red-400 hover:bg-gray-800"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#13151d] overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-gray-100">Histórico (últimos 200)</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Carregando...</div>
        ) : fLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Nenhum SMS registado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-800/40">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Data</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Vendedor</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Telefone</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Mensagem</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {fLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3 text-gray-300">{new Date(l.created_at).toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-200">{l.seller_name}</div>
                      <div className="text-gray-500">{l.seller_email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono">{l.recipient_phone}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-md truncate" title={l.message}>{l.message}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${l.status === "sent" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {l.status === "sent" ? "Enviado" : "Falhou"}
                      </span>
                      {l.error_message && <div className="text-[11px] text-gray-500 mt-1">{l.error_message}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSms;
