import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Account } from "../models/Account.js";
import { signToken } from "../utils/jwt.js";

import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { registerSchema, loginSchema, updateMeSchema } from "../schemas.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), async (req, res) => {
  const { email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash });
  await Account.create({ user: user._id, name: "Cash", type: "cash" });

  const token = signToken(user._id);
  res.status(201).json({ token, user: { id: user._id, email: user.email, currency: user.currency } });
});

authRouter.post("/login", validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user._id);
  res.json({ token, user: { id: user._id, email: user.email, currency: user.currency } });
});

authRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ id: user._id, email: user.email, currency: user.currency });
});

authRouter.patch("/me", requireAuth, validateBody(updateMeSchema), async (req: AuthRequest, res) => {
  const { currency } = req.body;

  const user = await User.findByIdAndUpdate(req.userId, { currency }, { new: true });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ id: user._id, email: user.email, currency: user.currency });
});
