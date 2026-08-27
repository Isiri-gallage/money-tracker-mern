import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { runChat, type ChatTurn } from "../services/geminiChat.js";
import { User } from "../models/User.js";

export const chatRouter = Router();

chatRouter.use(requireAuth);

const MAX_HISTORY = 20;

function isChatTurn(value: unknown): value is ChatTurn {
  if (typeof value !== "object" || value === null) return false;
  const turn = value as Partial<ChatTurn>;
  return (turn.role === "user" || turn.role === "model") && typeof turn.text === "string";
}

chatRouter.post("/", async (req: AuthRequest, res) => {
  const { message, history } = req.body;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  const safeHistory: ChatTurn[] = Array.isArray(history) ? history.filter(isChatTurn).slice(-MAX_HISTORY) : [];

    try {
    const user = await User.findById(req.userId);
    const currency = user?.currency ?? "USD";
    const reply = await runChat(req.userId!, safeHistory, message.trim(), currency);
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(502).json({ error: "The assistant is unavailable right now. Please try again." });
  }
});
