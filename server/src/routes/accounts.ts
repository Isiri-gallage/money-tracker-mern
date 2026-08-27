import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { Account, type AccountType } from "../models/Account.js";
import { Transaction } from "../models/Transaction.js";
import { validateBody } from "../middleware/validate.js";
import { accountSchema } from "../schemas.js";

export const accountsRouter = Router();

accountsRouter.use(requireAuth);

async function getBalancesByAccount(userId: string): Promise<Map<string, number>> {
  const rows = await Transaction.aggregate<{ _id: { account: mongoose.Types.ObjectId; type: string }; total: number }>([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: { account: "$account", type: "$type" }, total: { $sum: "$amount" } } },
  ]);

  const balances = new Map<string, number>();
  for (const row of rows) {
    const accountId = row._id.account.toString();
    const signedTotal = row._id.type === "income" ? row.total : -row.total;
    balances.set(accountId, (balances.get(accountId) ?? 0) + signedTotal);
  }
  return balances;
}

accountsRouter.get("/", async (req: AuthRequest, res) => {
  const [accounts, balances] = await Promise.all([
    Account.find({ user: req.userId }).sort({ createdAt: 1 }),
    getBalancesByAccount(req.userId!),
  ]);

  const result = accounts.map((a) => ({
    _id: a._id,
    name: a.name,
    type: a.type,
    color: a.color,
    balance: balances.get(a._id.toString()) ?? 0,
  }));

  res.json(result);
});

accountsRouter.post("/", validateBody(accountSchema), async (req: AuthRequest, res) => {
  const { name, type, color } = req.body as { name: string; type?: AccountType; color?: string };

  const account = await Account.create({
    user: req.userId,
    name,
    type: type || "cash",
    color: color || "#6366f1",
  });

  res.status(201).json({ ...account.toObject(), balance: 0 });
});

accountsRouter.delete("/:id", async (req: AuthRequest, res) => {
  const inUse = await Transaction.exists({ account: req.params.id, user: req.userId });
  if (inUse) {
    return res.status(409).json({ error: "Cannot delete an account that has transactions" });
  }

  const account = await Account.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!account) {
    return res.status(404).json({ error: "Account not found" });
  }

  res.status(204).send();
});
