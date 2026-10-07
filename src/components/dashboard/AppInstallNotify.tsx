import { useEffect, useState } from "react";
import { Bell, BellRing, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import saleChing from "@/assets/sale-ching.mp3.asset.json";

const VAPID_PUBLIC_KEY = "BMWZMuhR9VI576ObSFez08gU_RJzP0Ofyr__rrPFmeRV2UTjY_gcE_IIfN2_3K7BMdeBeQK1qKuTo2iRb9ww9TQ";

const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
const isPreview = location.hostname.includes("id-preview--") || location.hostname.includes("lovableproject.com");
const swAllowed = "serviceWorker" in navigator && !inIframe && !isPreview;

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const AppInstallNotify = () => {
  const { user } = useAuth();
  const [installEvt, setInstallEvt] = useState<any>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener("beforeinstallprompt", h);
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "SALE_PUSH") {
        const audio = new Audio(saleChing.url);
        audio.play().catch(() => {});
      }
    };
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", onMsg);
    if (swAllowed) {
      navigator.serviceWorker.register("/sw.js").then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setEnabled(!!sub && Notification.permission === "granted");
      }).catch(() => {});
    } else if ("serviceWorker" in navigator && (inIframe || isPreview)) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", h);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onMsg);
    };
  }, []);

  const enableNotifications = async () => {
    if (!swAllowed || !("PushManager" in window)) {
      toast.error("Abra o site publicado (kashpay.shop) para ativar as notificações. No iPhone, primeiro adicione ao ecrã inicial.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { toast.error("Permissão de notificações negada."); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) });
    const j = sub.toJSON() as any;
    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: user!.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
      { onConflict: "endpoint" }
    );
    if (error) { toast.error("Não foi possível ativar as notificações."); return; }
    setEnabled(true);
    toast.success("Notificações de vendas ativadas!");
  };

  const install = async () => {
    if (installEvt) { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null); }
  };

  return (
    <>
      {installEvt && (
        <button onClick={install} title="Instalar app"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Download className="h-4 w-4" />
        </button>
      )}
      <button onClick={enableNotifications} title={enabled ? "Notificações ativas" : "Ativar notificações de vendas"}
        className={`p-2 rounded-lg transition-colors hover:bg-accent ${enabled ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
        {enabled ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      </button>
    </>
  );
};

export default AppInstallNotify;
