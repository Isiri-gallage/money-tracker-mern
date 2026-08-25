import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { Transaction } from "../models/Transaction.js";
import { Account } from "../models/Account.js";

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

transactionsRouter.get("/", async (req: AuthRequest, res) => {
  const transactions = await Transaction.find({ user: req.userId }).sort({ date: -1 });
  res.json(transactions);
});

transactionsRouter.post("/", async (req: AuthRequest, res) => {
  const { amount, type, description, date, categoryId, accountId } = req.body;

  if (amount === undefined || !type || !accountId) {
    return res.status(400).json({ error: "amount, type, and accountId are required" });
  }

  const account = await Account.exists({ _id: accountId, user: req.userId });
  if (!account) {
    return res.status(400).json({ error: "Invalid accountId" });
  }

  const transaction = await Transaction.create({
    user: req.userId,
    account: accountId,
    category: categoryId || undefined,
    amount,
    type,
    description: description || "",
    date: date ? new Date(date) : new Date(),
  });

  res.status(201).json(transaction);
});

transactionsRouter.delete("/:id", async (req: AuthRequest, res) => {
  const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });

  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  res.status(204).send();
});

transactionsRouter.get("/summary", async (req: AuthRequest, res) => {
  const transactions = await Transaction.find({ user: req.userId }).populate("category");

  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }

    const categoryName = (tx.category as any)?.name ?? "Uncategorized";
    byCategory[categoryName] = (byCategory[categoryName] || 0) + tx.amount;
  }

  res.json({
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    byCategory,
  });
});
