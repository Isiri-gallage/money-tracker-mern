import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createTransaction } from "../api/transactions";
import type { Account } from "../api/accounts";
import type { Category, TxType } from "../api/categories";
import Select from "./Select";

interface Props {
  open: boolean;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}

export default function AddTransactionModal({ open, accounts, categories, onClose, onCreated }: Props) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TxType>("expense");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("none");  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAccountId = accountId || accounts[0]?._id || "";

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0 || !effectiveAccountId) return;

    setSaving(true);
    setError(null);
    try {
      await createTransaction({
        amount: value,
        type,
        description,
                categoryId: categoryId === "none" ? undefined : categoryId,
        accountId: effectiveAccountId,
        date: new Date(`${date}T00:00:00.000Z`).toISOString(),
      });
      setAmount("");
      setDescription("");
      setCategoryId("");
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-lg border border-line bg-card-hi px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-1 focus:ring-brand/40";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-tx-title"
        className="relative w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl shadow-black/50"
      >
        <div className="flex items-center justify-between">
          <h2 id="add-tx-title" className="text-sm font-semibold text-ink">
            Add transaction
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-faint transition hover:bg-card-hi hover:text-ink"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-dim">Amount</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
                className={`${field} tabular-nums`}
              />
            </div>
                        <div>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
                        <div>
              <label className="mb-1 block text-xs font-medium text-ink-dim">Account</label>
              <Select
                value={effectiveAccountId}
                onChange={setAccountId}
                options={accounts.map((a) => ({ value: a._id, label: a.name }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-dim">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-dim">Description</label>
            <input
              placeholder="e.g. Weekly groceries"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={field}
            />
          </div>

                    <div>
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

          {error && <p className="rounded-lg border border-neg/30 bg-neg/10 px-3 py-2 text-xs text-neg">{error}</p>}

          {accounts.length === 0 && (
            <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
              Create an account first before adding transactions.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-dim transition hover:bg-card-hi hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || accounts.length === 0}
              className="rounded-lg bg-gradient-to-r from-brand to-info px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}