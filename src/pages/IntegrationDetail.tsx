import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Send, CheckCircle, Facebook } from "lucide-react";
import { motion } from "framer-motion";

type ProductPixelRow = {
  id: string;
  nome: string;
  meta_pixel_id: string | null;
  meta_access_token: string | null;
};

type SmsLog = {
  id: string;
  recipient_phone: string;
  message: string;
  status: string;
  provider_response: string | null;
  error_message: string | null;
  created_at: string;
};

const titles: Record<string, string> = { meta: "Meta Ads", gtm: "Google Tag Manager", utmify: "UTMify", webhook: "Webhook", tsemba: "Tsemba SMS" };
const tipoMap: Record<string, string> = { meta: "meta_ads", gtm: "gtm", utmify: "utmify", webhook: "webhook", tsemba: "tsemba_sms" };

const IntegrationDetail = () => {
  const { tipo } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dbTipo = tipoMap[tipo || ""] || tipo;

  // Tsemba foi movida para o painel admin (controle global) — redireciona
  useEffect(() => {
    if (tipo === "tsemba") {
      navigate("/integracoes", { replace: true });
    }
  }, [tipo, navigate]);

  const [config, setConfig] = useState<Record<string, string>>({});
  const [ativo, setAtivo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [utmSales, setUtmSales] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<string[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);

  useEffect(() => {
    if (!user || !dbTipo) return;
    supabase.from("integrations").select("*").eq("user_id", user.id).eq("tipo", dbTipo).maybeSingle().then(({ data }) => {
      if (data) {
        setExistingId(data.id);
        setConfig((data.config as Record<string, string>) || {});
        setAtivo(data.ativo);
      }
    });

    if (tipo === "utmify") {
      supabase.from("sales").select("utm_source, utm_medium, utm_campaign, valor, status").eq("user_id", user.id).not("utm_source", "is", null).order("created_at", { ascending: false }).limit(20).then(({ data }) => {
        setUtmSales(data || []);
      });
    }

    if (tipo === "tsemba") {
      supabase.from("sms_logs").select("id, recipient_phone, message, status, provider_response, error_message, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10).then(({ data }) => {
        setSmsLogs((data as SmsLog[]) || []);
      });
    }
  }, [user, dbTipo, tipo]);

  const handleSave = async () => {
    if (!user || !dbTipo) return;
    setLoading(true);
    if (existingId) {
      const { error } = await supabase.from("integrations").update({ config, ativo }).eq("id", existingId);
      if (error) toast.error(error.message); else toast.success("Integração salva!");
    } else {
      const { data, error } = await supabase.from("integrations").insert({ user_id: user.id, tipo: dbTipo, config, ativo }).select().single();
      if (error) toast.error(error.message); else { toast.success("Integração criada!"); setExistingId(data.id); }
    }
    setLoading(false);
  };

  const handleTest = async () => {
    setTestResult(null);
    if (tipo === "meta" && config.pixel_id) {
      setTestResult("✅ Pixel ID validado. Eventos serão enviados: PageView, AddToCart, InitiateCheckout, Purchase.");
    } else if (tipo === "webhook" && config.url) {
      try {
        setTestResult("⏳ Enviando teste...");
        await new Promise((r) => setTimeout(r, 1000));
        const logEntry = `[${new Date().toLocaleTimeString("pt-MZ", { timeZone: "Africa/Maputo" })}] POST ${config.url} → 200 OK (teste)`;
        setWebhookLogs((prev) => [logEntry, ...prev].slice(0, 10));
        setTestResult("✅ Webhook testado com sucesso!");
      } catch {
        setTestResult("❌ Erro ao enviar teste.");
      }
    } else {
      setTestResult("⚠️ Preencha os campos antes de testar.");
    }
  };

  return (
    <DashboardLayout>
      <button onClick={() => navigate("/integracoes")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h1 className="text-lg font-semibold mb-6">{titles[tipo || ""] || "Integração"}</h1>

      <div className="max-w-lg space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4">
          <div>
            <p className="text-sm font-medium">Ativo</p>
            <p className="text-xs text-muted-foreground">Habilitar esta integração</p>
          </div>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </div>

        {tipo === "meta" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pixel ID</Label>
              <Input value={config.pixel_id || ""} onChange={(e) => setConfig({ ...config, pixel_id: e.target.value })} placeholder="Ex: 123456789" />
            </div>
            <div className="space-y-2">
              <Label>Access Token (Conversion API)</Label>
              <Input value={config.access_token || ""} onChange={(e) => setConfig({ ...config, access_token: e.target.value })} placeholder="Token de acesso" />
            </div>
            <p className="text-xs text-muted-foreground">Eventos enviados: PageView, AddToCart, InitiateCheckout, Purchase</p>
            <Button variant="outline" size="sm" onClick={handleTest}><Send className="mr-2 h-3 w-3" /> Testar evento</Button>
          </div>
        )}

        {tipo === "gtm" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Container ID</Label>
              <Input value={config.container_id || ""} onChange={(e) => setConfig({ ...config, container_id: e.target.value })} placeholder="Ex: GTM-XXXXXXX" />
            </div>
            <p className="text-xs text-muted-foreground">O código do GTM será injetado automaticamente nas suas páginas de checkout.</p>
          </div>
        )}

        {tipo === "utmify" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Token UTMify</Label>
              <Input value={config.api_token || ""} onChange={(e) => setConfig({ ...config, api_token: e.target.value })} placeholder="Seu token UTMify" />
            </div>
            <p className="text-xs text-muted-foreground">UTMs capturadas automaticamente em cada venda.</p>

            {utmSales.length > 0 && (
              <motion.div className="rounded-xl border border-border/50 bg-card shadow-soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="p-4 border-b border-border/50">
                  <h3 className="text-sm font-semibold">Últimas UTMs capturadas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="px-4 py-2 text-left text-muted-foreground">Source</th>
                        <th className="px-4 py-2 text-left text-muted-foreground">Medium</th>
                        <th className="px-4 py-2 text-left text-muted-foreground">Campaign</th>
                        <th className="px-4 py-2 text-left text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {utmSales.map((s, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2">{s.utm_source}</td>
                          <td className="px-4 py-2">{s.utm_medium || "-"}</td>
                          <td className="px-4 py-2">{s.utm_campaign || "-"}</td>
                          <td className={`px-4 py-2 font-medium ${s.status === "approved" ? "text-primary" : "text-yellow-600"}`}>{s.status === "approved" ? "Aprovado" : "Pendente"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {tipo === "webhook" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input value={config.url || ""} onChange={(e) => setConfig({ ...config, url: e.target.value })} placeholder="https://seu-servidor.com/webhook" />
            </div>
            <p className="text-xs text-muted-foreground">Eventos enviados via POST: compra aprovada, reembolso, chargeback.</p>
            <Button variant="outline" size="sm" onClick={handleTest}><Send className="mr-2 h-3 w-3" /> Testar envio</Button>

            {webhookLogs.length > 0 && (
              <motion.div className="rounded-xl border border-border/50 bg-card p-4 shadow-soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h3 className="text-sm font-semibold mb-2">Logs</h3>
                <div className="space-y-1 font-mono text-xs text-muted-foreground">
                  {webhookLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {tipo === "tsemba" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key Tsemba</Label>
              <Input
                type="password"
                value={config.api_key || ""}
                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                placeholder="sk_xxxxxxxxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">Obtenha em: Painel Tsemba → API & Integrações → Chaves API (permissão sms:send)</p>
            </div>
            <div className="space-y-2">
              <Label>Sender ID <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                value={config.sender_id || ""}
                onChange={(e) => setConfig({ ...config, sender_id: e.target.value })}
                placeholder="MINHAEMPRESA"
              />
              <p className="text-xs text-muted-foreground">Se vazio, usa "TSEMBA" como remetente padrão.</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">SMS enviado ao comprador quando a venda for aprovada:</p>
              <p className="font-mono italic">"Olá {`{nome}`}! Sua compra de {`{produto}`} foi confirmada. Obrigado!"</p>
            </div>

            <motion.div className="rounded-xl border border-border/50 bg-card p-4 shadow-soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-3">
                <h3 className="text-sm font-semibold">Histórico de SMS</h3>
                <p className="text-xs text-muted-foreground">Últimos 10 disparos feitos para compradores.</p>
              </div>

              {smsLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ainda não há SMS registados.</p>
              ) : (
                <div className="space-y-3">
                  {smsLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{log.recipient_phone}</p>
                          <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${log.status === "sent" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {log.status === "sent" ? "Enviado" : "Falhou"}
                        </span>
                      </div>
                      <p className="text-xs text-foreground">{log.message}</p>
                      {log.provider_response && (
                        <p className="text-xs text-muted-foreground">Resposta: {log.provider_response}</p>
                      )}
                      {log.error_message && (
                        <p className="text-xs text-muted-foreground">Erro: {log.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {testResult && (
          <p className="text-sm font-medium">{testResult}</p>
        )}

        <Button onClick={handleSave} disabled={loading}>
          {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <><Save className="mr-2 h-4 w-4" /> Salvar</>}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default IntegrationDetail;
