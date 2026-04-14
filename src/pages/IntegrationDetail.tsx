import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

const titles: Record<string, string> = {
  meta: "Meta Ads",
  utmify: "UTMify",
  webhook: "Webhook",
};

const tipoMap: Record<string, string> = {
  meta: "meta_ads",
  utmify: "utmify",
  webhook: "webhook",
};

const IntegrationDetail = () => {
  const { tipo } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dbTipo = tipoMap[tipo || ""] || tipo;

  const [config, setConfig] = useState<Record<string, string>>({});
  const [ativo, setAtivo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !dbTipo) return;
    supabase.from("integrations").select("*").eq("user_id", user.id).eq("tipo", dbTipo).maybeSingle().then(({ data }) => {
      if (data) {
        setExistingId(data.id);
        setConfig((data.config as Record<string, string>) || {});
        setAtivo(data.ativo);
      }
    });
  }, [user, dbTipo]);

  const handleSave = async () => {
    if (!user || !dbTipo) return;
    setLoading(true);
    if (existingId) {
      const { error } = await supabase.from("integrations").update({ config, ativo }).eq("id", existingId);
      if (error) toast.error(error.message);
      else toast.success("Integração salva!");
    } else {
      const { error } = await supabase.from("integrations").insert({ user_id: user.id, tipo: dbTipo, config, ativo });
      if (error) toast.error(error.message);
      else toast.success("Integração criada!");
    }
    setLoading(false);
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
          </div>
        )}

        {tipo === "utmify" && (
          <div className="space-y-2">
            <Label>API Token UTMify</Label>
            <Input value={config.api_token || ""} onChange={(e) => setConfig({ ...config, api_token: e.target.value })} placeholder="Seu token UTMify" />
            <p className="text-xs text-muted-foreground">UTMs capturadas automaticamente em cada venda (utm_source, utm_medium, utm_campaign).</p>
          </div>
        )}

        {tipo === "webhook" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input value={config.url || ""} onChange={(e) => setConfig({ ...config, url: e.target.value })} placeholder="https://seu-servidor.com/webhook" />
            </div>
            <p className="text-xs text-muted-foreground">Eventos enviados via POST: compra aprovada, reembolso, chargeback.</p>
          </div>
        )}

        <Button onClick={handleSave} disabled={loading}>
          {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <><Save className="mr-2 h-4 w-4" /> Salvar</>}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default IntegrationDetail;
