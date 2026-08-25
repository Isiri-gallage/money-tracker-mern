export const CURRENCIES = ["USD", "EUR", "GBP", "LKR", "INR", "AUD", "CAD", "JPY"] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}
