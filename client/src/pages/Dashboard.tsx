import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Wallet,
  Landmark,
  CreditCard,
  Layers,
  LogOut,
  Plus,
  Trash2,
  TrendingDown,
  Receipt,
  Tag,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { formatCurrency, formatSignedCurrency, formatDate } from "../lib/format";
import { CURRENCIES, type CurrencyCode } from "../lib/currencies";
import { getCategories, createCategory, type Category, type TxType } from "../api/categories";
import { getAccounts, createAccount, deleteAccount, type Account, type AccountType } from "../api/accounts";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  getSummary,
  type Transaction,
  type Summary,
} from "../api/transactions";
import { getBudgets, upsertBudget, deleteBudget, type Budget } from "../api/budgets";
import RecurringPanel from "../components/RecurringPanel";
import SpendingCharts from "../components/SpendingCharts";
import BalanceHero from "../components/BalanceHero";
import { categoryIcon, categoryColor } from "../lib/categoryVisuals";


const ACCOUNT_ICONS: Record<AccountType, typeof Wallet> = {
  cash: Wallet,
  bank: Landmark,
  card: CreditCard,
  other: Layers,
};

const currentMonth = new Date().toISOString().slice(0, 7);

export default function Dashboard() {
  const { user, logout, updateCurrency } = useAuth();
  const currency = user?.currency ?? "USD";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [acctName, setAcctName] = useState("");
  const [acctType, setAcctType] = useState<AccountType>("cash");
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
const [budgetLimit, setBudgetLimit] = useState("");

  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<TxType>("expense");

  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<TxType>("expense");
  const [txDescription, setTxDescription] = useState("");
  const [txCategoryId, setTxCategoryId] = useState("");
  const [txAccountId, setTxAccountId] = useState("");

  async function loadAll() {
  setError(null);
  try {
    const [accts, cats, txs, sum, bgts] = await Promise.all([
      getAccounts(),
      getCategories(),
      getTransactions(),
      getSummary(),
      getBudgets(currentMonth),
    ]);
    setAccounts(accts);
    setCategories(cats);
    setTransactions(txs);
    setSummary(sum);
    setBudgets(bgts);
    setTxAccountId((prev) => prev || accts[0]?._id || "");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to load data");
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: fetch data on mount
    loadAll();
  }, []);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c._id, c));
    return map;
  }, [categories]);

  const accountById = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach((a) => map.set(a._id, a));
    return map;
  }, [accounts]);



  async function handleAddAccount(e: FormEvent) {
    e.preventDefault();
    if (!acctName.trim()) return;
    try {
      await createAccount({ name: acctName, type: acctType });
      setAcctName("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add account");
    }
  }

  async function handleDeleteAccount(account: Account) {
    if (!window.confirm(`Delete account "${account.name}"?`)) return;
    try {
      await deleteAccount(account._id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    }
  }

  async function handleAddBudget(e: FormEvent) {
  e.preventDefault();
  const limit = parseFloat(budgetLimit);
  if (!budgetCategoryId || !limit || limit <= 0) return;

  try {
    await upsertBudget({ categoryId: budgetCategoryId, month: currentMonth, limit });
    setBudgetCategoryId("");
    setBudgetLimit("");
    await loadAll();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to save budget");
  }
}

async function handleDeleteBudget(budget: Budget) {
  if (!window.confirm(`Remove budget for "${budget.categoryName}"?`)) return;
  try {
    await deleteBudget(budget._id);
    await loadAll();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to delete budget");
  }
}

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      await createCategory({ name: catName, type: catType });
      setCatName("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
    }
  }

  async function handleAddTransaction(e: FormEvent) {
    e.preventDefault();
    const amount = parseFloat(txAmount);
    if (!amount || amount <= 0 || !txAccountId) return;

    try {
      await createTransaction({
        amount,
        type: txType,
        description: txDescription,
        categoryId: txCategoryId || undefined,
        accountId: txAccountId,
      });

      setTxAmount("");
      setTxDescription("");
      setTxCategoryId("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction");
    }
  }

  async function handleDeleteTransaction(t: Transaction) {
    const label = t.description || formatSignedCurrency(t.amount, t.type, currency);
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    try {
      await deleteTransaction(t._id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete transaction");
    }
  }

  async function handleCurrencyChange(e: ChangeEvent<HTMLSelectElement>) {
    await updateCurrency(e.target.value as CurrencyCode);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink-faint text-sm">
        Loading your ledger…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-line bg-card px-5 py-6">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <Wallet size={16} className="text-white" strokeWidth={2} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Money Tracker</span>
        </div>

        <nav className="mt-8 flex-1">
          <div className="flex items-center gap-2.5 rounded-lg bg-brand/15 px-3 py-2 text-sm font-medium text-brand-soft">
            <Receipt size={16} strokeWidth={2} />
            Ledger
          </div>
        </nav>

        <div className="border-t border-line pt-4">
          <p className="truncate px-1 text-xs text-ink-faint">{user?.email}</p>

          <div className="mt-3 px-1">
            <label className="mb-1 block text-xs font-medium text-ink-faint">Currency</label>
            <select
              value={currency}
              onChange={handleCurrencyChange}
              className="w-full rounded-lg border border-line bg-card-hi px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={logout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-dim transition-colors hover:bg-card-hi hover:text-ink"
          >
            <LogOut size={16} strokeWidth={2} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="flex items-center justify-between border-b border-line bg-card px-6 py-4 md:hidden">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-ink" />
            <span className="font-semibold text-ink">Money Tracker</span>
          </div>
          <button onClick={logout} className="text-sm font-medium text-ink-dim">
            Log out
          </button>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {error && (
            <p className="mb-6 rounded-lg border border-neg/30 bg-neg/10 px-4 py-2.5 text-sm text-neg">
              {error}
            </p>
          )}

                    {summary && <BalanceHero summary={summary} currency={currency} />}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section className="rounded-2xl border border-line bg-card p-6">
                <h2 className="text-sm font-semibold text-ink">Add transaction</h2>
                <form onSubmit={handleAddTransaction} className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="w-40">
                    <label className="mb-1 block text-xs font-medium text-ink-dim">Account</label>
                    <select
                      value={txAccountId}
                      onChange={(e) => setTxAccountId(e.target.value)}
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
                  <div className="w-28">
                    <label className="mb-1 block text-xs font-medium text-ink-dim">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      required
                      className="w-full rounded-lg border border-line px-3 py-2 text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
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
                      className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <label className="mb-1 block text-xs font-medium text-ink-dim">Description</label>
                    <input
                      placeholder="e.g. Weekly groceries"
                      value={txDescription}
                      onChange={(e) => setTxDescription(e.target.value)}
                      className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                    />
                  </div>
                  <div className="w-40">
                    <label className="mb-1 block text-xs font-medium text-ink-dim">Category</label>
                    <select
                      value={txCategoryId}
                      onChange={(e) => setTxCategoryId(e.target.value)}
                      className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                    >
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
                    className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    Add
                  </button>
                </form>
              </section>

              <section className="overflow-hidden rounded-2xl border border-line bg-card">
                <h2 className="px-6 pt-5 text-sm font-semibold text-ink">Transactions</h2>

                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                    <Receipt size={28} className="text-ink-faint" strokeWidth={1.5} />
                    <p className="text-sm text-ink-faint">No transactions yet — add your first one above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="mt-4 w-full text-sm">
                      <thead>
                        <tr className="border-y border-line text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                          <th className="px-6 py-2.5 font-medium">Date</th>
                          <th className="px-6 py-2.5 font-medium">Description</th>
                          <th className="px-6 py-2.5 font-medium">Account</th>
                          <th className="px-6 py-2.5 font-medium">Category</th>
                          <th className="px-6 py-2.5 text-right font-medium">Amount</th>
                          <th className="w-10 px-6 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {transactions.map((t) => {
                          const category = t.category ? categoryById.get(t.category) : undefined;
                          const account = accountById.get(t.account);
                          return (
                            <tr key={t._id} className="group">
                              <td className="whitespace-nowrap px-6 py-3.5 text-ink-dim">{formatDate(t.date)}</td>
                              <td className="px-6 py-3.5 text-ink">{t.description || "—"}</td>
                              <td className="whitespace-nowrap px-6 py-3.5 text-ink-dim">
                                {account?.name ?? "—"}
                              </td>
                              <td className="px-6 py-3.5">
                                {category ? (
                                  (() => {
                                    const Icon = categoryIcon(category.name);
                                    const color = categoryColor(category.name);
                                    return (
                                      <span className="inline-flex items-center gap-2 rounded-full bg-card-hi py-1 pl-1 pr-3 text-xs font-medium text-ink-dim">
                                        <span
                                          className="flex h-5 w-5 items-center justify-center rounded-full"
                                          style={{ backgroundColor: `${color}33` }}
                                        >
                                          <Icon size={11} style={{ color }} strokeWidth={2.4} />
                                        </span>
                                        {category.name}
                                      </span>
                                    );
                                  })()
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
                                  onClick={() => handleDeleteTransaction(t)}
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
                )}
              </section>
                            <RecurringPanel
                accounts={accounts}
                categories={categories}
                currency={currency}
                onChanged={loadAll}
              />
                            <SpendingCharts
                transactions={transactions}
                categories={categories}
                currency={currency}
              />
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-line bg-card p-6">
                <h2 className="text-sm font-semibold text-ink">Accounts</h2>

                <form onSubmit={handleAddAccount} className="mt-4 space-y-2">
                  <input
                    placeholder="Account name"
                    value={acctName}
                    onChange={(e) => setAcctName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                  />
                  <div className="flex gap-2">
                    <select
                      value={acctType}
                      onChange={(e) => setAcctType(e.target.value as AccountType)}
                      className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      Add
                    </button>
                  </div>
                </form>

                {accounts.length > 0 ? (
                  <ul className="mt-5 space-y-1 border-t border-line pt-4">
                    {accounts.map((a) => {
                      const Icon = ACCOUNT_ICONS[a.type];
                      return (
                        <li key={a._id} className="group flex items-center justify-between rounded-lg px-1 py-2">
                          <span className="flex items-center gap-2.5 text-sm text-ink">
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-full"
                              style={{ backgroundColor: `${a.color}1a` }}
                            >
                              <Icon size={13} style={{ color: a.color }} strokeWidth={2.25} />
                            </span>
                            {a.name}
                          </span>
                          <span className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium tabular-nums ${
                                a.balance < 0 ? "text-neg" : "text-ink"
                              }`}
                            >
                              {formatCurrency(a.balance, currency)}
                            </span>
                            <button
                              onClick={() => handleDeleteAccount(a)}
                              aria-label="Delete account"
                              className="rounded-md p-1 text-ink-faint opacity-0 transition-colors hover:bg-neg/10 hover:text-neg group-hover:opacity-100"
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mt-5 flex flex-col items-center gap-2 border-t border-line py-6 text-center">
                    <Wallet size={20} className="text-ink-faint" strokeWidth={1.5} />
                    <p className="text-xs text-ink-faint">No accounts yet.</p>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-line bg-card p-6">
                <h2 className="text-sm font-semibold text-ink">Budgets this month</h2>

                <form onSubmit={handleAddBudget} className="mt-4 space-y-2">
                  <select
                    value={budgetCategoryId}
                    onChange={(e) => setBudgetCategoryId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
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
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Monthly limit"
                      value={budgetLimit}
                      onChange={(e) => setBudgetLimit(e.target.value)}
                      required
                      className="flex-1 rounded-lg border border-line px-3 py-2 text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      Set
                    </button>
                  </div>
                </form>

                                {budgets.length > 0 ? (
                  <ul className="mt-5 space-y-2 border-t border-line pt-4">
                    {budgets.map((b) => {
                      const pct = Math.min(100, (b.spent / b.limit) * 100);
                      const over = b.remaining < 0;
                      const ringColor = over ? "#fb7185" : pct >= 70 ? "#fbbf24" : "#34d399";
                      const C = 2 * Math.PI * 15.5;
                      const Icon = categoryIcon(b.categoryName);
                      return (
                        <li
                          key={b._id}
                          className="group flex items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-card-hi"
                        >
                          <div className="relative h-11 w-11 shrink-0">
                            <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
                              <circle cx="20" cy="20" r="15.5" fill="none" strokeWidth="4" className="stroke-line" />
                              <circle
                                cx="20"
                                cy="20"
                                r="15.5"
                                fill="none"
                                strokeWidth="4"
                                strokeLinecap="round"
                                stroke={ringColor}
                                strokeDasharray={C}
                                strokeDashoffset={C - (C * pct) / 100}
                                style={{ transition: "stroke-dashoffset 500ms ease" }}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Icon size={13} style={{ color: ringColor }} strokeWidth={2.3} />
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium text-ink">{b.categoryName}</span>
                              <button
                                onClick={() => handleDeleteBudget(b)}
                                aria-label="Delete budget"
                                className="shrink-0 rounded-md p-0.5 text-ink-faint opacity-0 transition-colors hover:text-neg group-hover:opacity-100"
                              >
                                <Trash2 size={12} strokeWidth={2} />
                              </button>
                            </div>
                            <p className="mt-0.5 text-[11px] tabular-nums text-ink-faint">
                              {formatCurrency(b.spent, currency)} of {formatCurrency(b.limit, currency)}
                            </p>
                            <p
                              className={`text-[11px] font-medium tabular-nums ${over ? "text-neg" : "text-ink-dim"}`}
                            >
                              {over
                                ? `${formatCurrency(Math.abs(b.remaining), currency)} over`
                                : `${formatCurrency(b.remaining, currency)} left`}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mt-5 flex flex-col items-center gap-2 border-t border-line py-6 text-center">
                    <TrendingDown size={20} className="text-ink-faint" strokeWidth={1.5} />
                    <p className="text-xs text-ink-faint">No budgets set for this month.</p>
                  </div>
                )}
              </section>


              <section className="rounded-2xl border border-line bg-card p-6">
                <h2 className="text-sm font-semibold text-ink">Categories</h2>

                <form onSubmit={handleAddCategory} className="mt-4 space-y-2">
                  <input
                    placeholder="Category name"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                  />
                  <div className="flex gap-2">
                    <select
                      value={catType}
                      onChange={(e) => setCatType(e.target.value as TxType)}
                      className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      Add
                    </button>
                  </div>
                </form>

                                {categories.length > 0 ? (
                  <ul className="mt-5 space-y-1 border-t border-line pt-4">
                    {categories.map((c) => {
                      const Icon = categoryIcon(c.name);
                      const color = categoryColor(c._id);
                      return (
                        <li
                          key={c._id}
                          className="flex items-center justify-between rounded-xl px-1 py-2 transition-colors hover:bg-card-hi"
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
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              c.type === "income" ? "bg-pos/15 text-pos" : "bg-neg/15 text-neg"
                            }`}
                          >
                            {c.type}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  
                ) : (
                  <div className="mt-5 flex flex-col items-center gap-2 border-t border-line py-6 text-center">
                    <Tag size={20} className="text-ink-faint" strokeWidth={1.5} />
                    <p className="text-xs text-ink-faint">No categories yet.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
