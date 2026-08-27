import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { RecurringTransaction, type RecurrenceFrequency } from "../models/RecurringTransaction.js";
import { Account } from "../models/Account.js";
import { validateBody } from "../middleware/validate.js";
import { recurringSchema, recurringActiveSchema } from "../schemas.js";

export const recurringRouter = Router();

recurringRouter.use(requireAuth);

recurringRouter.get("/", async (req: AuthRequest, res) => {
  const items = await RecurringTransaction.find({ user: req.userId }).sort({ nextRunDate: 1 });
  res.json(items);
});

recurringRouter.post("/", validateBody(recurringSchema), async (req: AuthRequest, res) => {
  const { accountId, categoryId, amount, type, description, frequency, startDate } = req.body as {
    accountId: string;
    categoryId?: string;
    amount: number;
    type: string;
    description?: string;
    frequency: RecurrenceFrequency;
    startDate?: string;
  };

  const account = await Account.exists({ _id: accountId, user: req.userId });
  if (!account) {
    return res.status(400).json({ error: "Invalid accountId" });
  }

  const recurring = await RecurringTransaction.create({
    user: req.userId,
    account: accountId,
    category: categoryId || undefined,
    amount,
    type,
    description: description || "",
    frequency,
    nextRunDate: startDate ? new Date(startDate) : new Date(),
  });

  res.status(201).json(recurring);
});

recurringRouter.patch("/:id", validateBody(recurringActiveSchema), async (req: AuthRequest, res) => {
  const { active } = req.body;

  const recurring = await RecurringTransaction.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { active },
    { new: true },
  );

  if (!recurring) {
    return res.status(404).json({ error: "Recurring transaction not found" });
  }

  res.json(recurring);
});

recurringRouter.delete("/:id", async (req: AuthRequest, res) => {
  const recurring = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!recurring) {
    return res.status(404).json({ error: "Recurring transaction not found" });
  }
  res.status(204).send();
});