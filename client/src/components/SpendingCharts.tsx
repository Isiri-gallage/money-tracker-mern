import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartPie } from "lucide-react";
import { formatCurrency } from "../lib/format";
import type { CurrencyCode } from "../lib/currencies";
import type { Category } from "../api/categories";
import type { Transaction } from "../api/transactions";

const PALETTE = [
  "#6366f1",
  "#059669",
  "#dc2626",
  "#d97706",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#0d9488",
];

interface Props {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
}

export default function SpendingCharts({ transactions, categories, currency }: Props) {
  const thisMonth = new Date().toISOString().slice(0, 7);

  const categoryNames = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c._id, c.name));
    return map;
  }, [categories]);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      if (t.date.slice(0, 7) !== thisMonth) continue;
      const name = (t.category && categoryNames.get(t.category)) || "Uncategorized";
      totals.set(name, (totals.get(name) ?? 0) + t.amount);
    }
    return Array.from(totals, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions, categoryNames, thisMonth]);

  const monthTotal = byCategory.reduce((sum, d) => sum + d.value, 0);

  const monthly = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(d.toISOString().slice(0, 7));
    }

    const rows = new Map(months.map((m) => [m, { month: m, income: 0, expense: 0 }]));
    for (const t of transactions) {
      const row = rows.get(t.date.slice(0, 7));
      if (!row) continue;
      if (t.type === "income") row.income += t.amount;
      else row.expense += t.amount;
    }

    return months.map((m) => ({
      ...rows.get(m)!,
      label: new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
    }));
  }, [transactions]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <ChartPie size={15} className="text-slate-400" strokeWidth={2} />
        <h2 className="text-sm font-semibold text-slate-900">Insights</h2>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-slate-500">Spending by category · this month</p>

          {byCategory.length === 0 ? (
            <p className="mt-16 text-center text-xs text-slate-400">No expenses recorded this month.</p>
          ) : (
            <>
              <div className="relative mt-2 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {byCategory.map((entry, i) => (
                        <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400">Total</span>
                  <span className="text-lg font-semibold tabular-nums text-slate-900">
                    {formatCurrency(monthTotal, currency)}
                  </span>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5">
                {byCategory.map((d, i) => (
                  <li key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                      />
                      {d.name}
                    </span>
                    <span className="tabular-nums text-slate-400">
                      {formatCurrency(d.value, currency)} · {Math.round((d.value / monthTotal) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">Income vs expense · last 6 months</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} cursor={{ fill: "#f8fafc" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill="#059669" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#e11d48" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}