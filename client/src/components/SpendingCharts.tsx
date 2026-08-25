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
import { categoryColor } from "../lib/categoryVisuals";
import type { CurrencyCode } from "../lib/currencies";
import type { CategorySlice, MonthlyPoint } from "../api/stats";

interface Props {
  byCategory: CategorySlice[];
  monthly: MonthlyPoint[];
  currency: CurrencyCode;
}

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

export default function SpendingCharts({ byCategory, monthly, currency }: Props) {
  const monthTotal = byCategory.reduce((sum, d) => sum + d.total, 0);
  const trend = monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex items-center gap-2">
        <ChartPie size={15} className="text-ink-faint" strokeWidth={2} />
        <h2 className="text-sm font-semibold text-ink">Insights</h2>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-ink-dim">Spending by category · this month</p>

          {byCategory.length === 0 ? (
            <p className="mt-16 text-center text-xs text-ink-faint">No expenses recorded this month.</p>
          ) : (
            <>
              <div className="relative mt-2 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {byCategory.map((entry) => (
                        <Cell key={entry.name} fill={categoryColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-ink-faint">Total</span>
                  <span className="text-lg font-semibold tabular-nums text-ink">
                    {formatCurrency(monthTotal, currency)}
                  </span>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5">
                {byCategory.map((d) => (
                  <li key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-ink-dim">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: categoryColor(d.name) }}
                      />
                      {d.name}
                    </span>
                    <span className="tabular-nums text-ink-faint">
                      {formatCurrency(d.total, currency)} · {Math.round((d.total / monthTotal) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-ink-dim">Income vs expense · last 6 months</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232c40" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5b6885" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5b6885" }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} cursor={{ fill: "#1c2436" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill="#34d399" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#fb7185" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
