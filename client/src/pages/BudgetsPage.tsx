import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, Target, Trash2 } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useReferenceData } from "../hooks/useReferenceData";
import { formatCurrency } from "../lib/format";
import { categoryIcon } from "../lib/categoryVisuals";
import PageHeader from "../components/PageHeader";
import { getBudgets, upsertBudget, deleteBudget, type Budget } from "../api/budgets";

function shiftMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNum - 1 + delta, 1)).toISOString().slice(0, 7);
}

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function BudgetsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";
  const { categories } = useReferenceData();

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      setBudgets(await getBudgets(month));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: fetch when month changes
    load();
  }, [load]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(limit);
    if (!categoryId || !value || value <= 0) return;
    try {
      await upsertBudget({ categoryId, month, limit: value });
      setCategoryId("");
      setLimit("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save budget");
    }
  }

  async function handleDelete(budget: Budget) {
    if (!window.confirm(`Remove budget for "${budget.categoryName}"?`)) return;
    try {
      await deleteBudget(budget._id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete budget");
    }
  }

  const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const inputClass =
    "w-full rounded-lg border border-line bg-card-hi px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-1 focus:ring-brand/40";

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <PageHeader
        title="Budgets"
        subtitle="Monthly spending limits per category"
        action={
          <div className="flex items-center gap-1 rounded-xl border border-line bg-card p-1">
            <button
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              aria-label="Previous month"
              className="rounded-lg p-1.5 text-ink-dim transition hover:bg-card-hi hover:text-ink"
            >
              <ChevronLeft size={16} strokeWidth={2.2} />
            </button>
            <span className="min-w-[130px] text-center text-sm font-medium text-ink">{monthLabel(month)}</span>
            <button
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              aria-label="Next month"
              className="rounded-lg p-1.5 text-ink-dim transition hover:bg-card-hi hover:text-ink"
            >
              <ChevronRight size={16} strokeWidth={2.2} />
            </button>
          </div>
        }
      />

      {error && (
        <p className="mb-6 rounded-lg border border-neg/30 bg-neg/10 px-4 py-2.5 text-sm text-neg">{error}</p>
      )}

      {budgets.length > 0 && (
        <section className="mb-6 rounded-2xl border border-line bg-card p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">Budgeted this month</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
                {formatCurrency(totalSpent, currency)}
                <span className="text-base font-normal text-ink-faint"> of {formatCurrency(totalLimit, currency)}</span>
              </p>
            </div>
            <p
              className={`text-sm font-medium tabular-nums ${
                totalLimit - totalSpent < 0 ? "text-neg" : "text-pos"
              }`}
            >
              {formatCurrency(Math.abs(totalLimit - totalSpent), currency)}{" "}
              {totalLimit - totalSpent < 0 ? "over" : "left"}
            </p>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-card-hi">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0)}%`,
                backgroundColor: totalSpent > totalLimit ? "#fb7185" : "#34d399",
              }}
            />
          </div>
        </section>
      )}

      <section className="mb-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="text-sm font-semibold text-ink">Set a budget</h2>
        <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="">Select category…</option>
              {categories
                .filter((c) => c.type === "expense")
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Monthly limit</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              required
              className={`${inputClass} tabular-nums`}
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            <Plus size={15} strokeWidth={2.5} />
            Set
          </button>
        </form>
      </section>

      {loading ? (
        <p className="py-10 text-center text-sm text-ink-faint">Loading…</p>
      ) : budgets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card py-16 text-center">
          <Target size={28} className="text-ink-faint" strokeWidth={1.5} />
          <p className="text-sm text-ink-faint">No budgets set for {monthLabel(month)}.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {budgets.map((b) => {
            const pct = Math.min(100, (b.spent / b.limit) * 100);
            const over = b.remaining < 0;
            const ringColor = over ? "#fb7185" : pct >= 70 ? "#fbbf24" : "#34d399";
            const C = 2 * Math.PI * 26;
            const Icon = categoryIcon(b.categoryName);
            return (
              <li
                key={b._id}
                className="group flex items-center gap-4 rounded-2xl border border-line bg-card p-5 transition-colors hover:bg-card-hi"
              >
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" strokeWidth="6" className="stroke-line" />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      strokeWidth="6"
                      strokeLinecap="round"
                      stroke={ringColor}
                      strokeDasharray={C}
                      strokeDashoffset={C - (C * pct) / 100}
                      style={{ transition: "stroke-dashoffset 500ms ease" }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Icon size={18} style={{ color: ringColor }} strokeWidth={2.2} />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ink">{b.categoryName}</span>
                    <button
                      onClick={() => handleDelete(b)}
                      aria-label="Delete budget"
                      className="shrink-0 rounded-md p-1 text-ink-faint opacity-0 transition-colors hover:text-neg group-hover:opacity-100"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs tabular-nums text-ink-faint">
                    {formatCurrency(b.spent, currency)} of {formatCurrency(b.limit, currency)}
                  </p>
                  <p className={`text-xs font-medium tabular-nums ${over ? "text-neg" : "text-ink-dim"}`}>
                    {over
                      ? `${formatCurrency(Math.abs(b.remaining), currency)} over`
                      : `${formatCurrency(b.remaining, currency)} left`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
