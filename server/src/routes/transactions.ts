import { Router } from "express";
import type { FilterQuery } from "mongoose";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { transactionSchema, csvPreviewSchema, csvCommitSchema } from "../schemas.js";
import { parseBankCsv } from "../services/csvImport.js";
import { Transaction } from "../models/Transaction.js";
import { Account } from "../models/Account.js";

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function parsePositiveInt(value: unknown, fallback: number, max?: number): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function buildFilter(req: AuthRequest): FilterQuery<typeof Transaction> {
  const { from, to, type, categoryId, accountId, q } = req.query;

  const filter: FilterQuery<typeof Transaction> = { user: req.userId };

  if (type === "income" || type === "expense") {
    filter.type = type;
  }

  if (typeof categoryId === "string" && categoryId) {
    filter.category = categoryId;
  }

  if (typeof accountId === "string" && accountId) {
    filter.account = accountId;
  }

  if (typeof from === "string" || typeof to === "string") {
    const range: Record<string, Date> = {};
    if (typeof from === "string" && !Number.isNaN(Date.parse(from))) {
      range.$gte = new Date(from);
    }
    if (typeof to === "string" && !Number.isNaN(Date.parse(to))) {
      range.$lte = new Date(to);
    }
    if (Object.keys(range).length > 0) {
      filter.date = range;
    }
  }

  if (typeof q === "string" && q.trim()) {
    filter.description = { $regex: escapeRegex(q.trim()), $options: "i" };
  }

  return filter;
}

transactionsRouter.get("/", async (req: AuthRequest, res) => {
  const filter = buildFilter(req);

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);

  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

transactionsRouter.get("/export", async (req: AuthRequest, res) => {
  const filter = buildFilter(req);

  const items = await Transaction.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .populate("category")
    .populate("account");

  const header = "Date,Description,Account,Category,Type,Amount\n";
  const rows = items.map((t) => {
    const date = t.date.toISOString().slice(0, 10);
    const description = csvEscape(t.description || "");
    const account = csvEscape((t.account as unknown as { name?: string })?.name ?? "");
    const category = csvEscape((t.category as unknown as { name?: string })?.name ?? "Uncategorized");
    const amount = t.type === "expense" ? `-${t.amount.toFixed(2)}` : t.amount.toFixed(2);
    return [date, description, account, category, t.type, amount].join(",");
  });

  const csv = header + rows.join("\n");
  const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

transactionsRouter.post("/import/preview", validateBody(csvPreviewSchema), async (req: AuthRequest, res) => {
  const { csvText } = req.body;
  const { rows, skipped } = parseBankCsv(csvText);

  const withDuplicateFlags = await Promise.all(
    rows.map(async (row) => {
      const dayStart = new Date(`${row.date}T00:00:00.000Z`);
      const dayEnd = new Date(`${row.date}T23:59:59.999Z`);
      const duplicate = await Transaction.exists({
        user: req.userId,
        amount: row.amount,
        type: row.type,
        date: { $gte: dayStart, $lte: dayEnd },
        description: row.description,
      });
      return { ...row, duplicate: Boolean(duplicate) };
    }),
  );

  res.json({ rows: withDuplicateFlags, skipped });
});

transactionsRouter.post("/import/commit", validateBody(csvCommitSchema), async (req: AuthRequest, res) => {
  const { accountId, categoryId, transactions } = req.body;

  const account = await Account.exists({ _id: accountId, user: req.userId });
  if (!account) {
    return res.status(400).json({ error: "Invalid accountId" });
  }

  const docs = transactions.map((t: { date: string; description: string; amount: number; type: "income" | "expense" }) => ({
    user: req.userId,
    account: accountId,
    category: categoryId || undefined,
    amount: t.amount,
    type: t.type,
    description: t.description,
    date: new Date(t.date),
  }));

  const created = await Transaction.insertMany(docs);
  res.status(201).json({ created: created.length });
});

transactionsRouter.post("/", validateBody(transactionSchema), async (req: AuthRequest, res) => {
  const { amount, type, description, date, categoryId, accountId } = req.body;

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

    const categoryName = (tx.category as unknown as { name?: string })?.name ?? "Uncategorized";
    byCategory[categoryName] = (byCategory[categoryName] || 0) + tx.amount;
  }

  res.json({
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    byCategory,
  });
});