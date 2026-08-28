import { useEffect, useState, type FormEvent } from "react";
import { Repeat, Plus, Trash2, Pause, Play, Pencil } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/format";
import type { CurrencyCode } from "../lib/currencies";
import type { Account } from "../api/accounts";
import type { Category, TxType } from "../api/categories";
import Select from "./Select";
import {
  getRecurring,
  createRecurring,
  updateRecurring,
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RecurringPanel({ accounts, categories, currency, onChanged }: Props) {
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TxType>("expense");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [categoryId, setCategoryId] = useState("none");
  const [startDate, setStartDate] = useState(today());
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

  function resetForm() {
    setAccountId("");
    setAmount("");
    setType("expense");
    setDescription("");
    setFrequency("monthly");
    setCategoryId("none");
    setStartDate(today());
    setEditingId(null);
  }

  function handleEdit(item: RecurringTransaction) {
    setEditingId(item._id);
    setAccountId(item.account);
    setAmount(String(item.amount));
    setType(item.type);
    setDescription(item.description);
    setFrequency(item.frequency);
    setCategoryId(item.category ?? "none");
    setStartDate(item.nextRunDate.slice(0, 10));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0 || !effectiveAccountId) return;

    setError(null);
    const payload = {
      accountId: effectiveAccountId,
      categoryId: categoryId === "none" ? undefined : categoryId,
      amount: value,
      type,
      description,
      frequency,
      startDate: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
    };

    try {
      if (editingId) {
        await updateRecurring(editingId, payload);
      } else {
        await createRecurring(payload);
      }
      resetForm();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingId ? "update" : "add"} recurring transaction`);
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
      if (editingId === item._id) resetForm();
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

      {editingId && (
        <p className="mt-3 text-xs font-medium text-brand-soft">Editing recurring transaction — update the fields below.</p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-36">
          <label className="mb-1 block text-xs font-medium text-ink-dim">Account</label>
          <Select
            value={effectiveAccountId}
            onChange={setAccountId}
            options={accounts.map((a) => ({ value: a._id, label: a.name }))}
          />
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
          <Select
            value={type}
            onChange={(v) => {
              setType(v as TxType);
              setCategoryId("none");
            }}
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs font-medium text-ink-dim">Every</label>
          <Select
            value={frequency}
            onChange={(v) => setFrequency(v as RecurrenceFrequency)}
            options={[
              { value: "daily", label: "Day" },
              { value: "weekly", label: "Week" },
              { value: "monthly", label: "Month" },
            ]}
          />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-ink-dim">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
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
          <Select
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: "none", label: "None" },
              ...categories.filter((c) => c.type === type).map((c) => ({ value: c._id, label: c.name })),
            ]}
          />
        </div>
        <button
          type="submit"
          disabled={accounts.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={15} strokeWidth={2.5} />
          {editingId ? "Save changes" : "Add"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-dim transition-colors hover:bg-card-hi hover:text-ink"
          >
            Cancel
          </button>
        )}
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
                  onClick={() => handleEdit(item)}
                  aria-label="Edit recurring transaction"
                  className="rounded-md p-1.5 text-ink-faint opacity-0 transition-colors hover:bg-card-hi hover:text-ink group-hover:opacity-100"
                >
                  <Pencil size={13} strokeWidth={2} />
                </button>
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