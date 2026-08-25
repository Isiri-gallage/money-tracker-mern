import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Wallet,
  Landmark,
  CreditCard,
  Layers,
  LogOut,
  Plus,
  Trash2,
  TrendingUp,
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
        Loading your ledger…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
            <Wallet size={16} className="text-white" strokeWidth={2} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">Money Tracker</span>
        </div>

        <nav className="mt-8 flex-1">
          <div className="flex items-center gap-2.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900">
            <Receipt size={16} strokeWidth={2} />
            Ledger
          </div>
        </nav>

        <div className="border-t border-slate-100 pt-4">
          <p className="truncate px-1 text-xs text-slate-400">{user?.email}</p>

          <div className="mt-3 px-1">
            <label className="mb-1 block text-xs font-medium text-slate-400">Currency</label>
            <select
              value={currency}
              onChange={handleCurrencyChange}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut size={16} strokeWidth={2} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 md:hidden">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-slate-900" />
            <span className="font-semibold text-slate-900">Money Tracker</span>
          </div>
          <button onClick={logout} className="text-sm font-medium text-slate-500">
            Log out
          </button>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {error && (
            <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          {summary && (
            <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="px-7 py-6">
                <p className="text-sm font-medium text-slate-500">Current balance</p>
                <p
                  className={`mt-1 text-4xl font-semibold tabular-nums tracking-tight ${
                    summary.balance >= 0 ? "text-slate-900" : "text-rose-600"
                  }`}
                >
                  {formatCurrency(summary.balance, currency)}
                </p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                <div className="flex items-center gap-3 px-7 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                    <TrendingUp size={16} className="text-emerald-600" strokeWidth={2.25} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400">Income</p>
                    <p className="text-base font-semibold tabular-nums text-slate-900">
                      {formatCurrency(summary.totalIncome, currency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-7 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50">
                    <TrendingDown size={16} className="text-rose-600" strokeWidth={2.25} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400">Expense</p>
                    <p className="text-base font-semibold tabular-nums text-slate-900">
                      {formatCurrency(summary.totalExpense, currency)}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900">Add transaction</h2>
                <form onSubmit={handleAddTransaction} className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="w-40">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Account</label>
                    <select
                      value={txAccountId}
                      onChange={(e) => setTxAccountId(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      {accounts.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <div className="w-32">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Type</label>
                    <select
                      value={txType}
                      onChange={(e) => {
                        setTxType(e.target.value as TxType);
                        setTxCategoryId("");
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
                    <input
                      placeholder="e.g. Weekly groceries"
                      value={txDescription}
                      onChange={(e) => setTxDescription(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <div className="w-40">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
                    <select
                      value={txCategoryId}
                      onChange={(e) => setTxCategoryId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    Add
                  </button>
                </form>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <h2 className="px-6 pt-5 text-sm font-semibold text-slate-900">Transactions</h2>

                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                    <Receipt size={28} className="text-slate-300" strokeWidth={1.5} />
                    <p className="text-sm text-slate-400">No transactions yet — add your first one above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="mt-4 w-full text-sm">
                      <thead>
                        <tr className="border-y border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                          <th className="px-6 py-2.5 font-medium">Date</th>
                          <th className="px-6 py-2.5 font-medium">Description</th>
                          <th className="px-6 py-2.5 font-medium">Account</th>
                          <th className="px-6 py-2.5 font-medium">Category</th>
                          <th className="px-6 py-2.5 text-right font-medium">Amount</th>
                          <th className="w-10 px-6 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.map((t) => {
                          const category = t.category ? categoryById.get(t.category) : undefined;
                          const account = accountById.get(t.account);
                          return (
                            <tr key={t._id} className="group">
                              <td className="whitespace-nowrap px-6 py-3.5 text-slate-500">{formatDate(t.date)}</td>
                              <td className="px-6 py-3.5 text-slate-900">{t.description || "—"}</td>
                              <td className="whitespace-nowrap px-6 py-3.5 text-slate-500">
                                {account?.name ?? "—"}
                              </td>
                              <td className="px-6 py-3.5">
                                {category ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                                    <span
                                      className="h-1.5 w-1.5 rounded-full"
                                      style={{ backgroundColor: category.color }}
                                    />
                                    {category.name}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-300">Uncategorized</span>
                                )}
                              </td>
                              <td
                                className={`whitespace-nowrap px-6 py-3.5 text-right font-medium tabular-nums ${
                                  t.type === "income" ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {formatSignedCurrency(t.amount, t.type, currency)}
                              </td>
                              <td className="px-6 py-3.5 text-right">
                                <button
                                  onClick={() => handleDeleteTransaction(t)}
                                  aria-label="Delete transaction"
                                  className="rounded-md p-1.5 text-slate-300 opacity-0 transition-colors hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
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
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900">Accounts</h2>

                <form onSubmit={handleAddAccount} className="mt-4 space-y-2">
                  <input
                    placeholder="Account name"
                    value={acctName}
                    onChange={(e) => setAcctName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <div className="flex gap-2">
                    <select
                      value={acctType}
                      onChange={(e) => setAcctType(e.target.value as AccountType)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      Add
                    </button>
                  </div>
                </form>

                {accounts.length > 0 ? (
                  <ul className="mt-5 space-y-1 border-t border-slate-100 pt-4">
                    {accounts.map((a) => {
                      const Icon = ACCOUNT_ICONS[a.type];
                      return (
                        <li key={a._id} className="group flex items-center justify-between rounded-lg px-1 py-2">
                          <span className="flex items-center gap-2.5 text-sm text-slate-700">
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
                                a.balance < 0 ? "text-rose-600" : "text-slate-900"
                              }`}
                            >
                              {formatCurrency(a.balance, currency)}
                            </span>
                            <button
                              onClick={() => handleDeleteAccount(a)}
                              aria-label="Delete account"
                              className="rounded-md p-1 text-slate-300 opacity-0 transition-colors hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mt-5 flex flex-col items-center gap-2 border-t border-slate-100 py-6 text-center">
                    <Wallet size={20} className="text-slate-300" strokeWidth={1.5} />
                    <p className="text-xs text-slate-400">No accounts yet.</p>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900">Budgets this month</h2>

                <form onSubmit={handleAddBudget} className="mt-4 space-y-2">
                  <select
                    value={budgetCategoryId}
                    onChange={(e) => setBudgetCategoryId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      Set
                    </button>
                  </div>
                </form>

                {budgets.length > 0 ? (
                  <ul className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                    {budgets.map((b) => {
                      const pct = Math.min(100, (b.spent / b.limit) * 100);
                      const barColor = pct >= 100 ? "#dc2626" : pct >= 70 ? "#d97706" : "#059669";
                      return (
                        <li key={b._id} className="group">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-600">{b.categoryName}</span>
                            <span className="flex items-center gap-2">
                              <span className="tabular-nums text-slate-400">
                                {formatCurrency(b.spent, currency)} / {formatCurrency(b.limit, currency)}
                              </span>
                              <button
                                onClick={() => handleDeleteBudget(b)}
                                aria-label="Delete budget"
                                className="rounded-md p-0.5 text-slate-300 opacity-0 transition-colors hover:text-rose-600 group-hover:opacity-100"
                              >
                                <Trash2 size={12} strokeWidth={2} />
                              </button>
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                          </div>
                          {b.remaining < 0 && (
                            <p className="mt-1 text-xs text-rose-600">
                              {formatCurrency(Math.abs(b.remaining), currency)} over budget
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mt-5 flex flex-col items-center gap-2 border-t border-slate-100 py-6 text-center">
                    <TrendingDown size={20} className="text-slate-300" strokeWidth={1.5} />
                    <p className="text-xs text-slate-400">No budgets set for this month.</p>
                  </div>
                )}
              </section>


              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900">Categories</h2>

                <form onSubmit={handleAddCategory} className="mt-4 space-y-2">
                  <input
                    placeholder="Category name"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <div className="flex gap-2">
                    <select
                      value={catType}
                      onChange={(e) => setCatType(e.target.value as TxType)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      Add
                    </button>
                  </div>
                </form>

                {categories.length > 0 ? (
                  <ul className="mt-5 space-y-1.5 border-t border-slate-100 pt-4">
                    {categories.map((c) => (
                      <li key={c._id} className="flex items-center justify-between py-1 text-sm">
                        <span className="flex items-center gap-2 text-slate-700">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                        <span className="text-xs capitalize text-slate-400">{c.type}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-5 flex flex-col items-center gap-2 border-t border-slate-100 py-6 text-center">
                    <Tag size={20} className="text-slate-300" strokeWidth={1.5} />
                    <p className="text-xs text-slate-400">No categories yet.</p>
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
