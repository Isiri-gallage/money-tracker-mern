import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { Category } from "../models/Category.js";
import { validateBody } from "../middleware/validate.js";
import { categorySchema } from "../schemas.js";

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

categoriesRouter.get("/", async (req: AuthRequest, res) => {
  const categories = await Category.find({ user: req.userId }).sort({ name: 1 });
  res.json(categories);
});

categoriesRouter.post("/", validateBody(categorySchema), async (req: AuthRequest, res) => {
  const { name, type, color } = req.body;

  const category = await Category.create({
    user: req.userId,
    name,
    type,
    color: color || "#C9A15C",
  });

  res.status(201).json(category);
});

categoriesRouter.delete("/:id", async (req: AuthRequest, res) => {
  const category = await Category.findOneAndDelete({ _id: req.params.id, user: req.userId });

  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }

  res.status(204).send();
});