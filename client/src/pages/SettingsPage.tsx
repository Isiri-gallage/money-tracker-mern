import { useState, type ChangeEvent, type FormEvent } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useReferenceData } from "../hooks/useReferenceData";
import { CURRENCIES, type CurrencyCode } from "../lib/currencies";
import { categoryIcon, categoryColor } from "../lib/categoryVisuals";
import PageHeader from "../components/PageHeader";
import { createCategory, deleteCategory, type Category, type TxType } from "../api/categories";

export default function SettingsPage() {
  const { user, updateCurrency, logout } = useAuth();
  const currency = user?.currency ?? "USD";
  const { categories, reload } = useReferenceData();

  const [name, setName] = useState("");
  const [type, setType] = useState<TxType>("expense");
  const [error, setError] = useState<string | null>(null);

  async function handleCurrencyChange(e: ChangeEvent<HTMLSelectElement>) {
    setError(null);
    try {
      await updateCurrency(e.target.value as CurrencyCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update currency");
    }
  }

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await createCategory({ name, type });
      setName("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
    }
  }

  async function handleDeleteCategory(category: Category) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setError(null);
    try {
      await deleteCategory(category._id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-card-hi px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-1 focus:ring-brand/40";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <PageHeader title="Settings" subtitle="Preferences, categories and account" />

      {error && (
        <p className="mb-6 rounded-lg border border-neg/30 bg-neg/10 px-4 py-2.5 text-sm text-neg">{error}</p>
      )}

      <section className="mb-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="text-sm font-semibold text-ink">Currency</h2>
        <p className="mt-1 text-xs text-ink-dim">
          Changes how every amount is displayed. Existing amounts are not converted.
        </p>
        <select value={currency} onChange={handleCurrencyChange} className={`${inputClass} mt-4 max-w-xs`}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </select>
      </section>

      <section className="mb-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="text-sm font-semibold text-ink">Categories</h2>

        <form onSubmit={handleAddCategory} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Name</label>
            <input
              placeholder="e.g. Groceries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as TxType)} className={inputClass}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add
          </button>
        </form>

        {categories.length > 0 ? (
          <ul className="mt-5 space-y-1 border-t border-line pt-4">
            {categories.map((c) => {
              const Icon = categoryIcon(c.name);
              const color = categoryColor(c.name);
              return (
                <li
                  key={c._id}
                  className="group flex items-center justify-between rounded-xl px-1 py-2 transition-colors hover:bg-card-hi"
                >
                  <span className="flex items-center gap-3 text-sm text-ink">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${color}22` }}
                    >
                      <Icon size={15} style={{ color }} strokeWidth={2.2} />
                    </span>
                    {c.name}
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        c.type === "income" ? "bg-pos/15 text-pos" : "bg-neg/15 text-neg"
                      }`}
                    >
                      {c.type}
                    </span>
                    <button
                      onClick={() => handleDeleteCategory(c)}
                      aria-label="Delete category"
                      className="rounded-md p-1.5 text-ink-faint opacity-0 transition-colors hover:bg-neg/10 hover:text-neg group-hover:opacity-100"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-2 border-t border-line py-8 text-center">
            <Tag size={22} className="text-ink-faint" strokeWidth={1.5} />
            <p className="text-xs text-ink-faint">No categories yet.</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="text-sm font-semibold text-ink">Account</h2>
        <p className="mt-1 text-xs text-ink-dim">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-4 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-dim transition hover:bg-card-hi hover:text-ink"
        >
          Log out
        </button>
      </section>
    </div>
  );
}
