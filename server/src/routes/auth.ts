import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Account } from "../models/Account.js";
import { signToken } from "../utils/jwt.js";
import { isCurrencyCode } from "../constants.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

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

authRouter.post("/login", async (req, res) => {
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

authRouter.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  const { currency } = req.body;

  if (!isCurrencyCode(currency)) {
    return res.status(400).json({ error: "Invalid currency" });
  }

  const user = await User.findByIdAndUpdate(req.userId, { currency }, { new: true });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ id: user._id, email: user.email, currency: user.currency });
});
