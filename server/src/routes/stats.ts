import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { Transaction } from "../models/Transaction.js";
import { Category } from "../models/Category.js";

export const statsRouter = Router();

statsRouter.use(requireAuth);

const MONTH_RE = /^\d{4}-\d{2}$/;

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthRange(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthNum - 1, 1)),
    end: new Date(Date.UTC(year, monthNum, 1)),
  };
}

function lastMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  }
  return months;
}

statsRouter.get("/overview", async (req: AuthRequest, res) => {
  const month = typeof req.query.month === "string" && MONTH_RE.test(req.query.month) ? req.query.month : currentMonth();
  const monthsBack = 6;
  const userId = new mongoose.Types.ObjectId(req.userId);
  const { start, end } = monthRange(month);

  const months = lastMonths(monthsBack);
  const trendStart = monthRange(months[0]).start;

  const [categoryRows, trendRows, categories] = await Promise.all([
    Transaction.aggregate<{ _id: mongoose.Types.ObjectId | null; total: number }>([
      { $match: { user: userId, type: "expense", date: { $gte: start, $lt: end } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate<{ _id: { month: string; type: string }; total: number }>([
      { $match: { user: userId, date: { $gte: trendStart } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$date", timezone: "UTC" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
    ]),
    Category.find({ user: req.userId }),
  ]);

  const nameById = new Map(categories.map((c) => [c._id.toString(), c.name]));

  const byCategory = categoryRows
    .map((row) => ({
      name: row._id ? (nameById.get(row._id.toString()) ?? "Uncategorized") : "Uncategorized",
      total: row.total,
    }))
    .sort((a, b) => b.total - a.total);

  const trendMap = new Map(months.map((m) => [m, { month: m, income: 0, expense: 0 }]));
  for (const row of trendRows) {
    const entry = trendMap.get(row._id.month);
    if (!entry) continue;
    if (row._id.type === "income") entry.income = row.total;
    else entry.expense = row.total;
  }

  res.json({
    month,
    byCategory,
    monthly: months.map((m) => trendMap.get(m)!),
  });
});
