import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { transactionsRouter } from "./routes/transactions.js";
import { accountsRouter } from "./routes/accounts.js";
import { budgetsRouter } from "./routes/budgets.js";
import { recurringRouter } from "./routes/recurring.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/categories", categoriesRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/auth", authRouter);
app.use("/api/recurring", recurringRouter);
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});