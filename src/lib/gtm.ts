let gtmLoaded = false;

export function loadGTM(containerId: string): void {
  if (gtmLoaded || !containerId) return;
  gtmLoaded = true;

  // Standard GTM snippet
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
  });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  const first = document.getElementsByTagName('script')[0];
  first?.parentNode?.insertBefore(s, first);
}

export function pushDataLayer(event: string, params?: Record<string, any>): void {
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({ event, ...params });
}
