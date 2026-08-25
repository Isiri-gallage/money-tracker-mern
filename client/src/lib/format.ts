import type { CurrencyCode } from "./currencies";

const currencyFormatters = new Map<CurrencyCode, Intl.NumberFormat>();

function getCurrencyFormatter(currency: CurrencyCode): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatCurrency(amount: number, currency: CurrencyCode = "USD"): string {
  return getCurrencyFormatter(currency).format(amount);
}

export function formatSignedCurrency(
  amount: number,
  type: "income" | "expense",
  currency: CurrencyCode = "USD",
): string {
  const sign = type === "income" ? "+" : "−";
  return `${sign}${getCurrencyFormatter(currency).format(Math.abs(amount))}`;
}

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}
