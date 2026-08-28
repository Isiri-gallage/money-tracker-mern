import { useState, type FormEvent } from "react";
import { Wallet, Landmark, CreditCard, Layers, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useReferenceData } from "../hooks/useReferenceData";
import { formatCurrency } from "../lib/format";
import PageHeader from "../components/PageHeader";
import { createAccount, deleteAccount, type Account, type AccountType } from "../api/accounts";
import Select from "../components/Select";

const ACCOUNT_ICONS: Record<AccountType, typeof Wallet> = {
  cash: Wallet,
  bank: Landmark,
  card: CreditCard,
  other: Layers,
};

const ACCOUNT_COLORS: Record<AccountType, string> = {
  cash: "#34d399",
  bank: "#8b5cf6",
  card: "#fb7185",
  other: "#22d3ee",
};

export default function AccountsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";
  const { accounts, loading, reload } = useReferenceData();

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("cash");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await createAccount({ name, type, color: ACCOUNT_COLORS[type] });
      setName("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add account");
    }
  }

  async function handleDelete(account: Account) {
    if (!window.confirm(`Delete account "${account.name}"?`)) return;
    setError(null);
    try {
      await deleteAccount(account._id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    }
  }

  const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
  const inputClass =
    "w-full rounded-lg border border-line bg-card-hi px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-1 focus:ring-brand/40";

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <PageHeader title="Accounts" subtitle="Where your money actually sits" />

      {error && (
        <p className="mb-6 rounded-lg border border-neg/30 bg-neg/10 px-4 py-2.5 text-sm text-neg">{error}</p>
      )}

      {accounts.length > 0 && (
        <section className="mb-6 rounded-2xl border border-line bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">Net worth</p>
          <p
            className={`mt-1 text-4xl font-semibold tabular-nums tracking-tight ${
              netWorth < 0 ? "text-neg" : "text-ink"
            }`}
          >
            {formatCurrency(netWorth, currency)}
          </p>
          <p className="mt-1 text-xs text-ink-dim">
            Across {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
          </p>
        </section>
      )}

      <section className="mb-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="text-sm font-semibold text-ink">Add account</h2>
        <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Name</label>
            <input
              placeholder="e.g. Chase Checking"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
            />
          </div>
                    <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-ink-dim">Type</label>
            <Select
              value={type}
              onChange={(v) => setType(v as AccountType)}
              options={[
                { value: "cash", label: "Cash" },
                { value: "bank", label: "Bank" },
                { value: "card", label: "Card" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add
          </button>
        </form>
      </section>

      {loading ? (
        <p className="py-10 text-center text-sm text-ink-faint">Loading…</p>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card py-16 text-center">
          <Wallet size={28} className="text-ink-faint" strokeWidth={1.5} />
          <p className="text-sm text-ink-faint">No accounts yet.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {accounts.map((a) => {
            const Icon = ACCOUNT_ICONS[a.type];
            const color = a.color || ACCOUNT_COLORS[a.type];
            return (
              <li
                key={a._id}
                className="group flex items-center gap-4 rounded-2xl border border-line bg-card p-5 transition-colors hover:bg-card-hi"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${color}22` }}
                >
                  <Icon size={20} style={{ color }} strokeWidth={2.1} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                  <p className="text-xs capitalize text-ink-faint">{a.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-base font-semibold tabular-nums ${a.balance < 0 ? "text-neg" : "text-ink"}`}
                  >
                    {formatCurrency(a.balance, currency)}
                  </span>
                  <button
                    onClick={() => handleDelete(a)}
                    aria-label="Delete account"
                    className="rounded-md p-1.5 text-ink-faint opacity-0 transition-colors hover:bg-neg/10 hover:text-neg group-hover:opacity-100"
                  >
                    <Trash2 size={14} strokeWidth={2} />
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
