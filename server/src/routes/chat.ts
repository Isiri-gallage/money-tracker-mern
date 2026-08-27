import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { chatSchema } from "../schemas.js";
import { runChat } from "../services/geminiChat.js";
import { User } from "../models/User.js";

export const chatRouter = Router();

chatRouter.use(requireAuth);

const MAX_HISTORY = 20;

chatRouter.post("/", validateBody(chatSchema), async (req: AuthRequest, res) => {
  const { message, history } = req.body;

  try {
    const user = await User.findById(req.userId);
    const currency = user?.currency ?? "USD";
    const reply = await runChat(req.userId!, history.slice(-MAX_HISTORY), message, currency);
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(502).json({ error: "The assistant is unavailable right now. Please try again." });
  }
});