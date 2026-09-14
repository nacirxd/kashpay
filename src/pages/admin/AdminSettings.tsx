import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";
import { ShieldCheck, Copy, Eye, EyeOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const AdminSettings = () => {
  const { adminFetch } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState<{ manual_key: string; uri: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [zenofyId, setZenofyId] = useState("");
  const [zenofyLoading, setZenofyLoading] = useState(true);
  const [zenofySaving, setZenofySaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminFetch("get_settings");
        setZenofyId(data?.zenofy_product_id || "");
      } catch (e: any) {
        toast.error(e.message);
      }
      setZenofyLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveZenofyId = async () => {
    setZenofySaving(true);
    try {
      await adminFetch("update_setting", { key: "zenofy_product_id", value: zenofyId });
      toast.success("ID Zenofy global salvo");
    } catch (e: any) {
      toast.error(e.message);
    }
    setZenofySaving(false);
  };

  const handleGet2FA = async () => {
    setLoading(true);
    try {
      const data = await adminFetch("get_2fa_setup");
      setSetup(data);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const copySecret = () => {
    if (setup?.manual_key) {
      navigator.clipboard.writeText(setup.manual_key);
      toast.success("Chave copiada!");
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Configurações</h1>

      <div className="rounded-xl border border-gray-800 bg-[#13151d] p-6 max-w-lg mb-6">
        <h2 className="font-semibold text-gray-100 mb-1">ID do produto na Zenofy (global)</h2>
        <p className="text-xs text-gray-500 mb-4">
          Todos os checkouts com Zenofy usam este ID. Os clientes não veem nem configuram este campo.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={zenofyId}
            onChange={(e) => setZenofyId(e.target.value)}
            placeholder={zenofyLoading ? "Carregando..." : "Cole aqui o ID do produto na Zenofy"}
            disabled={zenofyLoading}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 font-mono outline-none focus:border-emerald-600"
          />
          <button
            onClick={saveZenofyId}
            disabled={zenofySaving || zenofyLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {zenofySaving ? "..." : "Salvar"}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-3 break-all font-mono">
          Webhook Zenofy: https://eabvrprjqmpdcxkhwvbf.supabase.co/functions/v1/zenofy-webhook
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#13151d] p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-100">Autenticação 2FA</h2>
            <p className="text-xs text-gray-500">Google Authenticator</p>
          </div>
        </div>

        {!setup ? (
          <button
            onClick={handleGet2FA}
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Carregando..." : "Mostrar QR Code e Chave"}
          </button>
        ) : (
          <div className="space-y-5">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG value={setup.uri} size={200} />
              </div>
            </div>
            <p className="text-center text-xs text-gray-500">
              Escaneie o QR code com o Google Authenticator
            </p>

            {/* Manual key */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <p className="text-xs text-gray-500 mb-2">Ou insira a chave manualmente:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-emerald-400 font-mono break-all">
                  {showSecret ? setup.manual_key : "••••••••••••••••"}
                </code>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                  title={showSecret ? "Esconder" : "Mostrar"}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={copySecret}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                  title="Copiar"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => { setSetup(null); setShowSecret(false); }}
              className="w-full rounded-lg border border-gray-700 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
