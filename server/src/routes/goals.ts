import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { goalSchema, goalUpdateSchema, goalContributionSchema } from "../schemas.js";
import { Goal } from "../models/Goal.js";

export const goalsRouter = Router();

goalsRouter.use(requireAuth);

goalsRouter.get("/", async (req: AuthRequest, res) => {
  const goals = await Goal.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json(goals);
});

goalsRouter.post("/", validateBody(goalSchema), async (req: AuthRequest, res) => {
  const { name, targetAmount, targetDate, color } = req.body;

  const goal = await Goal.create({
    user: req.userId,
    name,
    targetAmount,
    targetDate: targetDate ? new Date(targetDate) : undefined,
    color: color || "#8b5cf6",
  });

  res.status(201).json(goal);
});

goalsRouter.patch("/:id", validateBody(goalUpdateSchema), async (req: AuthRequest, res) => {
  const { name, targetAmount, targetDate, color } = req.body;

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (targetAmount !== undefined) update.targetAmount = targetAmount;
  if (targetDate !== undefined) update.targetDate = new Date(targetDate);
  if (color !== undefined) update.color = color;

  const goal = await Goal.findOneAndUpdate({ _id: req.params.id, user: req.userId }, update, { new: true });
  if (!goal) {
    return res.status(404).json({ error: "Goal not found" });
  }

  res.json(goal);
});

goalsRouter.post("/:id/contribute", validateBody(goalContributionSchema), async (req: AuthRequest, res) => {
  const { amount } = req.body;

  const goal = await Goal.findOne({ _id: req.params.id, user: req.userId });
  if (!goal) {
    return res.status(404).json({ error: "Goal not found" });
  }

  goal.savedAmount = Math.max(0, goal.savedAmount + amount);
  await goal.save();

  res.json(goal);
});

goalsRouter.delete("/:id", async (req: AuthRequest, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!goal) {
    return res.status(404).json({ error: "Goal not found" });
  }
  res.status(204).send();
});