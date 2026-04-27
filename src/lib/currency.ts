export function formatMZN(value: number): string {
  return `MT ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatAOA(value: number): string {
  const fixed = value.toFixed(2); // "5000.00"
  const [intPart, decPart] = fixed.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `Kz ${withThousands},${decPart}`;
}

export function formatCurrency(value: number, currency: "MZN" | "AOA" | string | null | undefined = "MZN"): string {
  if (currency === "AOA") return formatAOA(value);
  return formatMZN(value);
}
