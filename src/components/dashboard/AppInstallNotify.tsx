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
        const sub = "pushManager" in reg ? await reg.pushManager.getSubscription() : null;
        const ok = !!sub && Notification.permission === "granted";
        setEnabled(ok);
        if (ok && sub) await saveSub(sub); // garante que este aparelho está registado
      }).catch(() => {});
    } else if ("serviceWorker" in navigator && (inIframe || isPreview)) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", h);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onMsg);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const saveSub = async (sub: PushSubscription) => {
    if (!user?.id) return false;
    const j = sub.toJSON() as any;
    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
      { onConflict: "endpoint" }
    );
    if (error) console.error("[push] erro a guardar", error);
    return !error;
  };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;

  const enableNotifications = async () => {
    if (isIOS && !isStandalone) {
      toast.info("No iPhone: toque em Partilhar (quadrado com seta) → \"Adicionar ao ecrã principal\". Depois abra o KashPay pelo ícone e toque no sino.", { duration: 10000 });
      return;
    }
    if (!swAllowed || !("PushManager" in window) || !("Notification" in window)) {
      toast.error("Este navegador não suporta notificações. Use o Chrome (Android) ou o app instalado no iPhone.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Notificações bloqueadas. Ative-as nas definições do telemóvel para o KashPay.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) });
      if (!(await saveSub(sub))) { toast.error("Não foi possível ativar as notificações."); return; }
      setEnabled(true);
      toast.success("Notificações de vendas ativadas!");
      reg.showNotification("KashPay", { body: "Vai receber aqui um aviso a cada venda aprovada.", icon: "/favicon.ico" }).catch(() => {});
    } catch (e) {
      console.error("[push]", e);
      toast.error("Falha ao ativar notificações. Feche e abra o app e tente de novo.");
    }
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
