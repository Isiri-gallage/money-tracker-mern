import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Receipt } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useReferenceData } from "../hooks/useReferenceData";
import { formatCurrency, formatSignedCurrency, formatDate } from "../lib/format";
import { categoryIcon, categoryColor } from "../lib/categoryVisuals";
import BalanceHero from "../components/BalanceHero";
import SpendingCharts from "../components/SpendingCharts";
import PageHeader from "../components/PageHeader";
import { getSummary, getTransactions, type Summary, type Transaction } from "../api/transactions";
import { getOverview, type Overview as OverviewStats } from "../api/stats";
import AddTransactionModal from "../components/AddTransactionModal";


export default function Overview() {
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";
  const { categories, accounts, reload: reloadReference } = useReferenceData();
  const [showAdd, setShowAdd] = useState(false);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextSummary, nextStats, page] = await Promise.all([
        getSummary(),
        getOverview(),
        getTransactions({ limit: 5 }),
      ]);
      setSummary(nextSummary);
      setStats(nextStats);
      setRecent(page.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: fetch on mount
    load();
  }, [load]);

  const categoryById = new Map(categories.map((c) => [c._id, c]));
  const accountById = new Map(accounts.map((a) => [a._id, a]));

  if (loading) {
    return <div className="p-8 text-sm text-ink-faint">Loading your ledger…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
            <PageHeader
        title="Overview"
        subtitle="Where your money stands right now"
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-info px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:brightness-110"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add transaction
          </button>
        }
      />

      <AddTransactionModal
        open={showAdd}
        accounts={accounts}
        categories={categories}
        onClose={() => setShowAdd(false)}
        onCreated={() => {
          load();
          reloadReference();
        }}
      />

      {error && (
        <p className="mb-6 rounded-lg border border-neg/30 bg-neg/10 px-4 py-2.5 text-sm text-neg">{error}</p>
      )}

      {summary && <BalanceHero summary={summary} currency={currency} />}

      {stats && (
        <div className="mb-6">
          <SpendingCharts byCategory={stats.byCategory} monthly={stats.monthly} currency={currency} />
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-xs font-medium text-brand-soft hover:underline"
          >
            View all
            <ArrowRight size={13} strokeWidth={2.4} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <Receipt size={28} className="text-ink-faint" strokeWidth={1.5} />
            <p className="text-sm text-ink-faint">No transactions yet.</p>
            <Link
              to="/transactions"
              className="mt-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
            >
              Add your first one
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {recent.map((t) => {
              const category = t.category ? categoryById.get(t.category) : undefined;
              const account = accountById.get(t.account);
              const Icon = categoryIcon(category?.name ?? "");
              const color = categoryColor(category?.name ?? "Uncategorized");
              return (
                <li key={t._id} className="flex items-center gap-3 px-6 py-3.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${color}22` }}
                  >
                    <Icon size={15} style={{ color }} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{t.description || "—"}</p>
                    <p className="text-xs text-ink-faint">
                      {formatDate(t.date)} · {account?.name ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium tabular-nums ${
                      t.type === "income" ? "text-pos" : "text-neg"
                    }`}
                  >
                    {formatSignedCurrency(t.amount, t.type, currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {accounts.length > 0 && (
        <section className="mt-6 rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Accounts</h2>
            <Link to="/accounts" className="text-xs font-medium text-brand-soft hover:underline">
              Manage
            </Link>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <li key={a._id} className="rounded-xl border border-line bg-card-hi px-4 py-3">
                <p className="text-xs text-ink-faint">{a.name}</p>
                <p
                  className={`mt-0.5 text-base font-semibold tabular-nums ${
                    a.balance < 0 ? "text-neg" : "text-ink"
                  }`}
                >
                  {formatCurrency(a.balance, currency)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
