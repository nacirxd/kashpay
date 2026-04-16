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
