declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

let pixelLoaded = false;

export function loadMetaPixel(pixelId: string): void {
  if (pixelLoaded || !pixelId) return;
  pixelLoaded = true;

  // Standard Meta Pixel base code
  const f = window;
  const b = document;
  if (f.fbq) return;

  const n: any = (f.fbq = function (...args: any[]) {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
  });
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];

  const s = b.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const firstScript = b.getElementsByTagName('script')[0];
  firstScript?.parentNode?.insertBefore(s, firstScript);

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

export function trackEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window.fbq === 'function') {
    window.fbq('track', eventName, params);
  }
}

export function trackCustom(eventName: string, params?: Record<string, any>): void {
  if (typeof window.fbq === 'function') {
    window.fbq('trackCustom', eventName, params);
  }
}

/** Lê um cookie do browser (usado para _fbp / _fbc). */
function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Anexa os parâmetros de rastreio do Meta (pixel + identificadores do clique)
 * a um link externo (upsell / downsell), para que a página de destino possa
 * atribuir a venda ao mesmo anúncio.
 */
export function withMetaTracking(
  url: string,
  opts: { pixelId?: string | null; extra?: Record<string, string | number | undefined | null> } = {}
): string {
  try {
    const target = new URL(url, window.location.href);
    const current = new URLSearchParams(window.location.search);

    const set = (key: string, value?: string | number | null) => {
      if (value === undefined || value === null || value === "") return;
      if (target.searchParams.has(key)) return;
      target.searchParams.set(key, String(value));
    };

    if (opts.pixelId) set("pixel_id", opts.pixelId);
    set("fbclid", current.get("fbclid"));
    set("fbp", readCookie("_fbp"));
    set("fbc", readCookie("_fbc"));
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) =>
      set(k, current.get(k))
    );
    Object.entries(opts.extra || {}).forEach(([k, v]) => set(k, v as any));

    return target.toString();
  } catch {
    return url;
  }
}
