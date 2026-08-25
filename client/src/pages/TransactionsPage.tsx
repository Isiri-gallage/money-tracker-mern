import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, Receipt, Search, Trash2, X } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useReferenceData } from "../hooks/useReferenceData";
import { formatSignedCurrency, formatDate } from "../lib/format";
import { categoryIcon, categoryColor } from "../lib/categoryVisuals";
import PageHeader from "../components/PageHeader";
import type { TxType } from "../api/categories";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  type Transaction,
  type TransactionPage,
} from "../api/transactions";

const EMPTY_FILTERS = {
  q: "",
  type: "" as TxType | "",
  categoryId: "",
  accountId: "",
  from: "",
  to: "",
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";
  const { accounts, categories, reload: reloadReference } = useReferenceData();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<TransactionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<TxType>("expense");
  const [txDescription, setTxDescription] = useState("");
  const [txCategoryId, setTxCategoryId] = useState("");
  const [txAccountId, setTxAccountId] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));

  const effectiveAccountId = txAccountId || accounts[0]?._id || "";

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 350);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getTransactions({
        page,
        limit: 20,
        q: debouncedQ,
        type: filters.type,
        categoryId: filters.categoryId,
        accountId: filters.accountId,
        from: filters.from,
        to: filters.to,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, filters.type, filters.categoryId, filters.accountId, filters.from, filters.to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: fetch when filters change
    load();
  }, [load]);

  function updateFilter<K extends keyof typeof EMPTY_FILTERS>(key: K, value: (typeof EMPTY_FILTERS)[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const hasFilters =
    filters.q !== "" ||
    filters.type !== "" ||
    filters.categoryId !== "" ||
    filters.accountId !== "" ||
    filters.from !== "" ||
    filters.to !== "";

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const amount = parseFloat(txAmount);
    if (!amount || amount <= 0 || !effectiveAccountId) return;

    try {
      await createTransaction({
        amount,
        type: txType,
        description: txDescription,
        categoryId: txCategoryId || undefined,
        accountId: effectiveAccountId,
        date: new Date(`${txDate}T00:00:00.000Z`).toISOString(),
      });
      setTxAmount("");
      setTxDescription("");
      setTxCategoryId("");
      setShowForm(false);
      setPage(1);
      await load();
      await reloadReference();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction");
    }
  }

  async function handleDelete(t: Transaction) {
    const label = t.description || formatSignedCurrency(t.amount, t.type, currency);
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    try {
      await deleteTransaction(t._id);
      await load();
      await reloadReference();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete transaction");
    }
  }

  const categoryById = new Map(categories.map((c) => [c._id, c]));
  const accountById = new Map(accounts.map((a) => [a._id, a]));
  const inputClass =
    "rounded-lg border border-line bg-card-hi px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-1 focus:ring-brand/40";
  const fieldClass = `${inputClass} w-full`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Transactions"
        subtitle={result ? `${result.total} total` : undefined}
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-info px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:brightness-110"
          >
            <Plus size={15} strokeWidth={2.5} />
            New transaction
          </button>
        }
      />

      {error && (
        <p className="mb-6 rounded-lg border border-neg/30 bg-neg/10 px-4 py-2.5 text-sm text-neg">{error}</p>
      )}

      {showForm && (
        <section className="mb-6 rounded-2xl border border-line bg-card p-6">
          <h2 className="text-sm font-semibold text-ink">Add transaction</h2>
          <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-36">
              <label className="mb-1 block text-xs font-medium text-ink-dim">Account</label>
              <select
                value={effectiveAccountId}
                onChange={(e) => setTxAccountId(e.target.value)}
                required
                className={fieldClass}
              >
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs font-medium text-ink-dim">Amount</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                required
                className={`${fieldClass} tabular-nums`}
              />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-xs font-medium text-ink-dim">Type</label>
              <select
                value={txType}
                onChange={(e) => {
                  setTxType(e.target.value as TxType);
                  setTxCategoryId("");
                }}
                className={fieldClass}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="w-40">
              <label className="mb-1 block text-xs font-medium text-ink-dim">Date</label>
              <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className={fieldClass} />
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-medium text-ink-dim">Description</label>
              <input
                placeholder="e.g. Weekly groceries"
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-xs font-medium text-ink-dim">Category</label>
              <select value={txCategoryId} onChange={(e) => setTxCategoryId(e.target.value)} className={fieldClass}>
                <option value="">None</option>
                {categories
                  .filter((c) => c.type === txType)
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={accounts.length === 0}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </section>
      )}

      <section className="mb-4 rounded-2xl border border-line bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Search</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" strokeWidth={2} />
              <input
                placeholder="Search descriptions…"
                value={filters.q}
                onChange={(e) => updateFilter("q", e.target.value)}
                className={`${inputClass} w-full pl-9`}
              />
            </div>
          </div>

          <div className="w-32">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Type</label>
            <select
              value={filters.type}
              onChange={(e) => updateFilter("type", e.target.value as TxType | "")}
              className={`${inputClass} w-full`}
            >
              <option value="">All types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Account</label>
            <select
              value={filters.accountId}
              onChange={(e) => updateFilter("accountId", e.target.value)}
              className={`${inputClass} w-full`}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Category</label>
            <select
              value={filters.categoryId}
              onChange={(e) => updateFilter("categoryId", e.target.value)}
              className={`${inputClass} w-full`}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-ink-dim">From date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => updateFilter("from", e.target.value)}
              className={`${inputClass} w-full`}
            />
          </div>

          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-ink-dim">To date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => updateFilter("to", e.target.value)}
              className={`${inputClass} w-full`}
            />
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setPage(1);
              }}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-ink-dim transition hover:bg-card-hi hover:text-ink"
            >
              <X size={13} strokeWidth={2.4} />
              Clear
            </button>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        {loading ? (
          <p className="px-6 py-14 text-center text-sm text-ink-faint">Loading…</p>
        ) : !result || result.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Receipt size={28} className="text-ink-faint" strokeWidth={1.5} />
            <p className="text-sm text-ink-faint">
              {hasFilters ? "No transactions match these filters." : "No transactions yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Account</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 text-right font-medium">Amount</th>
                    <th className="w-10 px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.items.map((t) => {
                    const category = t.category ? categoryById.get(t.category) : undefined;
                    const account = accountById.get(t.account);
                    const Icon = categoryIcon(category?.name ?? "");
                    const color = categoryColor(category?.name ?? "Uncategorized");
                    return (
                      <tr key={t._id} className="group transition-colors hover:bg-card-hi">
                        <td className="whitespace-nowrap px-6 py-3.5 text-ink-dim">{formatDate(t.date)}</td>
                        <td className="px-6 py-3.5 text-ink">{t.description || "—"}</td>
                        <td className="whitespace-nowrap px-6 py-3.5 text-ink-dim">{account?.name ?? "—"}</td>
                        <td className="px-6 py-3.5">
                          {category ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-card-hi py-1 pl-1 pr-3 text-xs font-medium text-ink-dim">
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded-full"
                                style={{ backgroundColor: `${color}33` }}
                              >
                                <Icon size={11} style={{ color }} strokeWidth={2.4} />
                              </span>
                              {category.name}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-faint">Uncategorized</span>
                          )}
                        </td>
                        <td
                          className={`whitespace-nowrap px-6 py-3.5 text-right font-medium tabular-nums ${
                            t.type === "income" ? "text-pos" : "text-neg"
                          }`}
                        >
                          {formatSignedCurrency(t.amount, t.type, currency)}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => handleDelete(t)}
                            aria-label="Delete transaction"
                            className="rounded-md p-1.5 text-ink-faint opacity-0 transition-colors hover:bg-neg/10 hover:text-neg group-hover:opacity-100"
                          >
                            <Trash2 size={14} strokeWidth={2} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {result.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-6 py-3">
                <p className="text-xs text-ink-faint">
                  Page {result.page} of {result.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={result.page <= 1}
                    className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-dim transition hover:bg-card-hi hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={14} strokeWidth={2.4} />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
                    disabled={result.page >= result.totalPages}
                    className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-dim transition hover:bg-card-hi hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={14} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
