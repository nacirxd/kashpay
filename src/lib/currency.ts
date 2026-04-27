export function formatMZN(value: number): string {
  return `MT ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatAOA(value: number): string {
  return `Kz ${value.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrency(value: number, currency: "MZN" | "AOA" | string | null | undefined = "MZN"): string {
  if (currency === "AOA") return formatAOA(value);
  return formatMZN(value);
}
