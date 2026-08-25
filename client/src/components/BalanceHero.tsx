import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "../lib/format";
import type { CurrencyCode } from "../lib/currencies";
import type { Summary } from "../api/transactions";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  summary: Summary;
  currency: CurrencyCode;
}

export default function BalanceHero({ summary, currency }: Props) {
  const spentPct =
    summary.totalIncome > 0 ? Math.min(100, (summary.totalExpense / summary.totalIncome) * 100) : 0;

  const positive = summary.balance >= 0;

  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl border border-line bg-card">
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-56 w-56 rounded-full bg-info/10 blur-3xl" />

      <div className="relative flex flex-col gap-8 p-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">Total balance</p>
          <p
            className={`mt-2 text-5xl font-semibold tabular-nums tracking-tight ${
              positive ? "text-ink" : "text-neg"
            }`}
          >
            {formatCurrency(summary.balance, currency)}
          </p>
          <p className="mt-2 text-xs text-ink-dim">
            {summary.totalIncome > 0
              ? `You've spent ${Math.round(spentPct)}% of what you earned`
              : "No income recorded yet"}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-card-hi px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pos/15">
                <TrendingUp size={16} className="text-pos" strokeWidth={2.4} />
              </span>
              <span>
                <span className="block text-[11px] font-medium text-ink-faint">Income</span>
                <span className="block text-sm font-semibold tabular-nums text-ink">
                  {formatCurrency(summary.totalIncome, currency)}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-line bg-card-hi px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neg/15">
                <TrendingDown size={16} className="text-neg" strokeWidth={2.4} />
              </span>
              <span>
                <span className="block text-[11px] font-medium text-ink-faint">Expense</span>
                <span className="block text-sm font-semibold tabular-nums text-ink">
                  {formatCurrency(summary.totalExpense, currency)}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="relative shrink-0 self-center">
          <svg viewBox="0 0 100 100" className="h-36 w-36 -rotate-90">
            <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="9" className="stroke-line" />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              stroke="url(#gaugeGradient)"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE - (CIRCUMFERENCE * spentPct) / 100}
              style={{ transition: "stroke-dashoffset 600ms ease" }}
            />
            <defs>
              <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--color-brand)" />
                <stop offset="100%" stopColor="var(--color-info)" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums text-ink">{Math.round(spentPct)}%</span>
            <span className="text-[11px] text-ink-faint">spent</span>
          </div>
        </div>
      </div>
    </section>
  );
}