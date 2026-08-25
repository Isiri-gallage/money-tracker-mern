import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { Budget } from "../models/Budget.js";
import { Category } from "../models/Category.js";
import { Transaction } from "../models/Transaction.js";

export const budgetsRouter = Router();

budgetsRouter.use(requireAuth);

const MONTH_RE = /^\d{4}-\d{2}$/;

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthRange(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNum - 1, 1));
  const end = new Date(Date.UTC(year, monthNum, 1));
  return { start, end };
}

budgetsRouter.get("/", async (req: AuthRequest, res) => {
  const month = typeof req.query.month === "string" && MONTH_RE.test(req.query.month) ? req.query.month : currentMonth();

  const budgets = await Budget.find({ user: req.userId, month }).populate("category");
  const { start, end } = monthRange(month);

  const spentRows = await Transaction.aggregate<{ _id: mongoose.Types.ObjectId; spent: number }>([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.userId),
        type: "expense",
        date: { $gte: start, $lt: end },
        category: { $in: budgets.map((b) => b.category._id) },
      },
    },
    { $group: { _id: "$category", spent: { $sum: "$amount" } } },
  ]);
  const spentByCategory = new Map(spentRows.map((r) => [r._id.toString(), r.spent]));

  const result = budgets.map((b) => {
    const category = b.category as unknown as { _id: mongoose.Types.ObjectId; name: string; color: string };
    const spent = spentByCategory.get(category._id.toString()) ?? 0;
    return {
      _id: b._id,
      categoryId: category._id,
      categoryName: category.name,
      categoryColor: category.color,
      month: b.month,
      limit: b.limit,
      spent,
      remaining: b.limit - spent,
    };
  });

  res.json(result);
});

budgetsRouter.post("/", async (req: AuthRequest, res) => {
  const { categoryId, month, limit } = req.body;

  if (!categoryId || !month || !MONTH_RE.test(month) || typeof limit !== "number" || limit <= 0) {
    return res.status(400).json({ error: "categoryId, a valid month (YYYY-MM), and a positive limit are required" });
  }

  const category = await Category.findOne({ _id: categoryId, user: req.userId });
  if (!category) {
    return res.status(400).json({ error: "Invalid categoryId" });
  }

  const budget = await Budget.findOneAndUpdate(
    { user: req.userId, category: categoryId, month },
    { limit },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(201).json(budget);
});

budgetsRouter.delete("/:id", async (req: AuthRequest, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!budget) {
    return res.status(404).json({ error: "Budget not found" });
  }
  res.status(204).send();
});