import { useEffect, useState, type FormEvent } from "react";
import { Repeat, Plus, Trash2, Pause, Play } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/format";
import type { CurrencyCode } from "../lib/currencies";
import type { Account } from "../api/accounts";
import type { Category, TxType } from "../api/categories";
import {
  getRecurring,
  createRecurring,
  setRecurringActive,
  deleteRecurring,
  type RecurringTransaction,
  type RecurrenceFrequency,
} from "../api/recurring";

interface Props {
  accounts: Account[];
  categories: Category[];
  currency: CurrencyCode;
  onChanged: () => void;
}

export default function RecurringPanel({ accounts, categories, currency, onChanged }: Props) {
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TxType>("expense");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [categoryId, setCategoryId] = useState("");
  const effectiveAccountId = accountId || accounts[0]?._id || "";

  async function load() {
    try {
      const data = await getRecurring();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recurring transactions");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: fetch data on mount
    load();
  }, []);

  

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0 || !effectiveAccountId) return;

    setError(null);
    try {
      await createRecurring({
        accountId: effectiveAccountId,
        categoryId: categoryId || undefined,
        amount: value,
        type,
        description,
        frequency,
      });
      setAmount("");
      setDescription("");
      setCategoryId("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add recurring transaction");
    }
  }

  async function handleToggle(item: RecurringTransaction) {
    try {
      await setRecurringActive(item._id, !item.active);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function handleDelete(item: RecurringTransaction) {
    const label = item.description || formatCurrency(item.amount, currency);
    if (!window.confirm(`Delete recurring "${label}"? Past transactions it created are kept.`)) return;
    try {
      await deleteRecurring(item._id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex items-center gap-2">
        <Repeat size={15} className="text-ink-faint" strokeWidth={2} />
        <h2 className="text-sm font-semibold text-ink">Recurring</h2>
      </div>

      {error && <p className="mt-3 rounded-lg bg-neg/10 px-3 py-2 text-xs text-neg">{error}</p>}

      <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-36">
          <label className="mb-1 block text-xs font-medium text-ink-dim">Account</label>
          <select
             value={effectiveAccountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          >
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs font-medium text-ink-dim">Amount</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full rounded-lg border border-line px-3 py-2 text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs font-medium text-ink-dim">Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as TxType);
              setCategoryId("");
            }}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs font-medium text-ink-dim">Every</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          >
            <option value="daily">Day</option>
            <option value="weekly">Week</option>
            <option value="monthly">Month</option>
          </select>
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-dim">Description</label>
          <input
            placeholder="e.g. Netflix"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
        <div className="w-36">
          <label className="mb-1 block text-xs font-medium text-ink-dim">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          >
            <option value="">None</option>
            {categories
              .filter((c) => c.type === type)
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
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add
        </button>
      </form>

      {items.length > 0 ? (
        <ul className="mt-5 divide-y divide-line border-t border-line">
          {items.map((item) => (
            <li key={item._id} className="group flex items-center justify-between py-3">
              <div className={item.active ? "" : "opacity-50"}>
                <p className="text-sm text-ink">{item.description || "(no description)"}</p>
                <p className="text-xs text-ink-faint">
                  Every {item.frequency.replace("ly", "")} · next {formatDate(item.nextRunDate)}
                  {!item.active && " · paused"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium tabular-nums ${
                    item.type === "income" ? "text-pos" : "text-neg"
                  }`}
                >
                  {item.type === "income" ? "+" : "−"}
                  {formatCurrency(item.amount, currency)}
                </span>
                <button
                  onClick={() => handleToggle(item)}
                  aria-label={item.active ? "Pause" : "Resume"}
                  className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-card-hi hover:text-ink"
                >
                  {item.active ? <Pause size={13} strokeWidth={2} /> : <Play size={13} strokeWidth={2} />}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  aria-label="Delete recurring transaction"
                  className="rounded-md p-1.5 text-ink-faint opacity-0 transition-colors hover:bg-neg/10 hover:text-neg group-hover:opacity-100"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-2 border-t border-line py-8 text-center">
          <Repeat size={22} className="text-ink-faint" strokeWidth={1.5} />
          <p className="text-xs text-ink-faint">Nothing recurring yet — add a subscription or salary above.</p>
        </div>
      )}
    </section>
  );
}