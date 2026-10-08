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
    // Mantém "kp_done_sale" para que o ecrã de obrigado sobreviva a um refresh
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k !== "kp_done_sale") keys.push(k);
    }
    keys.forEach((k) => {
      if (sessionStorage.getItem(k) !== null) sessionStorage.removeItem(k);
    });
  } catch {
    /* ignora */
  }
}

forgetStoredData();
