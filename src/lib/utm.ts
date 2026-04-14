const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const STORAGE_KEY = "moonpay_utms";

export type UTMParams = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
};

export function captureUTMs(): void {
  const params = new URLSearchParams(window.location.search);
  const hasAny = UTM_KEYS.some((k) => params.has(k));
  if (!hasAny) return;

  const utms: UTMParams = {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(utms));
}

export function getStoredUTMs(): UTMParams {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null };
}
