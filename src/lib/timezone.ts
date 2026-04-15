// Mozambique timezone: CAT (Central Africa Time) = UTC+2
export const TIMEZONE = "Africa/Maputo";

export function toMozambiqueDate(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.toLocaleString("en-US", { timeZone: TIMEZONE }));
}

export function formatDateMZ(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-MZ", { timeZone: TIMEZONE, ...options });
}

export function formatTimeMZ(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("pt-MZ", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", ...options });
}

export function formatDateTimeMZ(date: Date | string): string {
  return `${formatDateMZ(date)} ${formatTimeMZ(date)}`;
}

/** Returns "now" in Mozambique local time as a Date object */
export function nowMZ(): Date {
  return toMozambiqueDate(new Date());
}
