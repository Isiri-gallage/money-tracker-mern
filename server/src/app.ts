import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { transactionsRouter } from "./routes/transactions.js";
import { accountsRouter } from "./routes/accounts.js";
import { budgetsRouter } from "./routes/budgets.js";
import { statsRouter } from "./routes/stats.js";
import { recurringRouter } from "./routes/recurring.js";
import { chatRouter } from "./routes/chat.js";
import { apiLimiter, authLimiter, chatLimiter } from "./middleware/rateLimit.js";

export const app = express();
app.set("trust proxy", 1);



/**
 * In production only the deployed frontend may call the API. CLIENT_ORIGIN
 * accepts a comma-separated list so preview deployments can be allowed too.
 * Locally (no CLIENT_ORIGIN set) any origin is allowed for convenience.
 */
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  }),
);

app.use(express.json());
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/recurring", recurringRouter);
app.use("/api/chat", chatLimiter, chatRouter);
