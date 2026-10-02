const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const STORAGE_KEY = "moonpay_utms";
const REF_KEY = "aureon_referrer";

export type UTMParams = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer_url?: string | null;
};

export function captureUTMs(): void {
  try {
    const ref = document.referrer;
    if (ref && !ref.startsWith(window.location.origin)) {
      localStorage.setItem(REF_KEY, ref.slice(0, 500));
    }
  } catch {}

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
  let referrer_url: string | null = null;
  try { referrer_url = localStorage.getItem(REF_KEY); } catch {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...JSON.parse(raw), referrer_url };
  } catch {}
  return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, referrer_url };
}
