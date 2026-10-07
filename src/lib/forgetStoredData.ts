// Apaga do aparelho tudo o que as versões anteriores guardaram sobre compras e contas.
const FORGET_PREFIXES = ["zenofy_sale_", "kp_status_"];

export function forgetStoredData() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && FORGET_PREFIXES.some((p) => k.startsWith(p))) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {
    /* ignora */
  }
}

forgetStoredData();
