import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import { MessageSquare, Send, RefreshCw } from "lucide-react";

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

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch("list_sms_logs");
      setLogs(data || []);
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

  const sentCount = logs.filter(l => l.status === "sent").length;
  const failedCount = logs.filter(l => l.status !== "sent").length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">SMS (Tsemba)</h1>
          <p className="text-sm text-gray-500">Controlo global de envio de SMS para todos os compradores.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

      <div className="rounded-xl border border-gray-800 bg-[#13151d] overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-gray-100">Histórico (últimos 200)</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Carregando...</div>
        ) : logs.length === 0 ? (
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
                {logs.map((l) => (
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
