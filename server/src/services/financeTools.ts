import mongoose from "mongoose";
import { Transaction } from "../models/Transaction.js";
import { Budget } from "../models/Budget.js";
import { Category } from "../models/Category.js";

const MONTH_RE = /^\d{4}-\d{2}$/;

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function resolveMonth(month?: string): string {
  return month && MONTH_RE.test(month) ? month : currentMonth();
}

function monthRange(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthNum - 1, 1)),
    end: new Date(Date.UTC(year, monthNum, 1)),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getSpendingSummary(userId: string, args: { month?: string }) {
  const month = resolveMonth(args.month);
  const { start, end } = monthRange(month);
  const uid = new mongoose.Types.ObjectId(userId);

  const rows = await Transaction.aggregate<{ _id: "income" | "expense"; total: number }>([
    { $match: { user: uid, date: { $gte: start, $lt: end } } },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);

  const totals = { income: 0, expense: 0 };
  for (const row of rows) {
    totals[row._id] = row.total;
  }

  return { month, income: totals.income, expense: totals.expense, balance: totals.income - totals.expense };
}

export async function getSpendingByCategory(userId: string, args: { month?: string }) {
  const month = resolveMonth(args.month);
  const { start, end } = monthRange(month);
  const uid = new mongoose.Types.ObjectId(userId);

  const [rows, categories] = await Promise.all([
    Transaction.aggregate<{ _id: mongoose.Types.ObjectId | null; total: number }>([
      { $match: { user: uid, type: "expense", date: { $gte: start, $lt: end } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]),
    Category.find({ user: userId }),
  ]);

  const nameById = new Map(categories.map((c) => [c._id.toString(), c.name]));
  const byCategory = rows
    .map((row) => ({
      category: row._id ? (nameById.get(row._id.toString()) ?? "Uncategorized") : "Uncategorized",
      total: row.total,
    }))
    .sort((a, b) => b.total - a.total);

  return { month, byCategory };
}

export async function getBudgetStatus(userId: string, args: { month?: string }) {
  const month = resolveMonth(args.month);
  const { start, end } = monthRange(month);
  const uid = new mongoose.Types.ObjectId(userId);

  const budgets = await Budget.find({ user: userId, month }).populate("category");
  if (budgets.length === 0) {
    return { month, budgets: [] };
  }

  const spentRows = await Transaction.aggregate<{ _id: mongoose.Types.ObjectId; spent: number }>([
    {
      $match: {
        user: uid,
        type: "expense",
        date: { $gte: start, $lt: end },
        category: { $in: budgets.map((b) => b.category._id) },
      },
    },
    { $group: { _id: "$category", spent: { $sum: "$amount" } } },
  ]);
  const spentByCategory = new Map(spentRows.map((r) => [r._id.toString(), r.spent]));

  return {
    month,
    budgets: budgets.map((b) => {
      const category = b.category as unknown as { _id: mongoose.Types.ObjectId; name: string };
      const spent = spentByCategory.get(category._id.toString()) ?? 0;
      return { category: category.name, limit: b.limit, spent, remaining: b.limit - spent };
    }),
  };
}

export async function searchTransactions(
  userId: string,
  args: { query?: string; categoryName?: string; type?: "income" | "expense"; from?: string; to?: string; limit?: number },
) {
  const filter: Record<string, unknown> = { user: userId };

  if (args.type === "income" || args.type === "expense") {
    filter.type = args.type;
  }

  if (args.categoryName) {
    const category = await Category.findOne({
      user: userId,
      name: { $regex: `^${escapeRegex(args.categoryName)}$`, $options: "i" },
    });
    // No matching category: force zero results rather than dropping the filter.
    filter.category = category ? category._id : new mongoose.Types.ObjectId();
  }

  if (args.query) {
    filter.description = { $regex: escapeRegex(args.query), $options: "i" };
  }

  if (args.from || args.to) {
    const range: Record<string, Date> = {};
    if (args.from && !Number.isNaN(Date.parse(args.from))) range.$gte = new Date(args.from);
    if (args.to && !Number.isNaN(Date.parse(args.to))) range.$lte = new Date(args.to);
    if (Object.keys(range).length > 0) filter.date = range;
  }

  const limit = Math.min(Math.max(args.limit ?? 10, 1), 25);

  const items = await Transaction.find(filter).sort({ date: -1 }).limit(limit).populate("category");

  return {
    count: items.length,
    transactions: items.map((t) => ({
      amount: t.amount,
      type: t.type,
      description: t.description,
      category: (t.category as unknown as { name?: string })?.name ?? "Uncategorized",
      date: t.date.toISOString().slice(0, 10),
    })),
  };
}
