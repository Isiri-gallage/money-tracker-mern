import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { formatCurrency } from "../lib/format";
import PageHeader from "../components/PageHeader";
import { getGoals, createGoal, contributeToGoal, deleteGoal, type Goal } from "../api/goals";

export default function GoalsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [contributions, setContributions] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      setGoals(await getGoals());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initial load
    load();
  }, [load]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(targetAmount);
    if (!name.trim() || !value || value <= 0) return;
    try {
      await createGoal({ name: name.trim(), targetAmount: value, targetDate: targetDate || undefined });
      setName("");
      setTargetAmount("");
      setTargetDate("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal");
    }
  }

  async function handleContribute(goal: Goal) {
    const amount = parseFloat(contributions[goal._id] ?? "");
    if (!amount) return;
    try {
      await contributeToGoal(goal._id, amount);
      setContributions((prev) => ({ ...prev, [goal._id]: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update goal");
    }
  }

  async function handleDelete(goal: Goal) {
    if (!window.confirm(`Delete goal "${goal.name}"? This can't be undone.`)) return;
    try {
      await deleteGoal(goal._id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete goal");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-card-hi px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-1 focus:ring-brand/40";

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <PageHeader title="Goals" subtitle="Save toward something specific" />

      {error && (
        <p className="mb-6 rounded-lg border border-neg/30 bg-neg/10 px-4 py-2.5 text-sm text-neg">{error}</p>
      )}

      <section className="mb-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="text-sm font-semibold text-ink">New goal</h2>
        <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Name</label>
            <input
              placeholder="e.g. New laptop"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Target amount</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
              className={`${inputClass} tabular-nums`}
            />
          </div>
          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Target date (optional)</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={inputClass} />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            <Plus size={15} strokeWidth={2.5} />
            Create
          </button>
        </form>
      </section>

      {loading ? (
        <p className="py-10 text-center text-sm text-ink-faint">Loading…</p>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card py-16 text-center">
          <PiggyBank size={28} className="text-ink-faint" strokeWidth={1.5} />
          <p className="text-sm text-ink-faint">No savings goals yet.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const pct = Math.min(100, (g.savedAmount / g.targetAmount) * 100);
            const reached = g.savedAmount >= g.targetAmount;
            return (
              <li key={g._id} className="group rounded-2xl border border-line bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${g.color}33` }}
                    >
                      <PiggyBank size={16} style={{ color: g.color }} strokeWidth={2.2} />
                    </span>
                    <span className="truncate text-sm font-medium text-ink">{g.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(g)}
                    aria-label="Delete goal"
                    className="shrink-0 rounded-md p-1 text-ink-faint opacity-0 transition-colors hover:text-neg group-hover:opacity-100"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>

                <p className="mt-3 text-xs tabular-nums text-ink-faint">
                  {formatCurrency(g.savedAmount, currency)} of {formatCurrency(g.targetAmount, currency)}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-card-hi">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: reached ? "#34d399" : g.color }}
                  />
                </div>
                {g.targetDate && (
                  <p className="mt-1 text-[11px] text-ink-faint">
                    Target:{" "}
                    {new Date(g.targetDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Add or withdraw amount"
                    value={contributions[g._id] ?? ""}
                    onChange={(e) => setContributions((prev) => ({ ...prev, [g._id]: e.target.value }))}
                    className={`${inputClass} flex-1 tabular-nums`}
                  />
                  <button
                    onClick={() => handleContribute(g)}
                    className="rounded-lg border border-line bg-card-hi px-3 py-2 text-xs font-medium text-ink-dim transition hover:text-ink"
                  >
                    Apply
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}