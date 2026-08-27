import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";
import { getSpendingSummary, getSpendingByCategory, getBudgetStatus, searchTransactions } from "./financeTools.js";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
});

async function seedUser(email: string) {
  const register = await request(app).post("/api/auth/register").send({ email, password: "secret123" });
  const token = register.body.token as string;
  const userId = register.body.user.id as string;

  const accounts = await request(app).get("/api/accounts").set("Authorization", `Bearer ${token}`);
  const accountId = accounts.body[0]._id as string;

  return { token, userId, accountId };
}

describe("getSpendingSummary", () => {
  it("totals income and expense for the given month, scoped to the user", async () => {
    const { token, userId, accountId } = await seedUser("summary@example.com");
    const { userId: otherUserId } = await seedUser("summary-other@example.com");

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1000, type: "income", accountId, date: "2026-03-05" });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 250, type: "expense", accountId, date: "2026-03-10" });

    const result = await getSpendingSummary(userId, { month: "2026-03" });
    expect(result).toEqual({ month: "2026-03", income: 1000, expense: 250, balance: 750 });

    const otherResult = await getSpendingSummary(otherUserId, { month: "2026-03" });
    expect(otherResult).toEqual({ month: "2026-03", income: 0, expense: 0, balance: 0 });
  });
});

describe("getSpendingByCategory", () => {
  it("groups expenses by category name, sorted highest first", async () => {
    const { token, userId, accountId } = await seedUser("category@example.com");

    const groceries = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Groceries", type: "expense" });
    const transport = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Transport", type: "expense" });

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 30, type: "expense", categoryId: transport.body._id, accountId, date: "2026-04-02" });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 120, type: "expense", categoryId: groceries.body._id, accountId, date: "2026-04-03" });

    const result = await getSpendingByCategory(userId, { month: "2026-04" });
    expect(result.byCategory).toEqual([
      { category: "Groceries", total: 120 },
      { category: "Transport", total: 30 },
    ]);
  });
});

describe("getBudgetStatus", () => {
  it("returns limit, spent, and remaining per budgeted category", async () => {
    const { token, userId, accountId } = await seedUser("budget@example.com");

    const category = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dining", type: "expense" });

    await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.body._id, month: "2026-05", limit: 200 });

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 75, type: "expense", categoryId: category.body._id, accountId, date: "2026-05-10" });

    const result = await getBudgetStatus(userId, { month: "2026-05" });
    expect(result.budgets).toEqual([{ category: "Dining", limit: 200, spent: 75, remaining: 125 }]);
  });

  it("returns an empty list when no budgets exist for the month", async () => {
    const { userId } = await seedUser("no-budget@example.com");
    const result = await getBudgetStatus(userId, { month: "2026-05" });
    expect(result).toEqual({ month: "2026-05", budgets: [] });
  });
});

describe("searchTransactions", () => {
  it("filters by free-text description, scoped to the user", async () => {
    const { token, userId, accountId } = await seedUser("search@example.com");

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 45, type: "expense", description: "Weekly groceries", accountId });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 2000, type: "income", description: "Salary", accountId });

    const result = await searchTransactions(userId, { query: "grocer" });
    expect(result.count).toBe(1);
    expect(result.transactions[0].description).toBe("Weekly groceries");
  });

  it("returns zero results for a category name that doesn't exist", async () => {
    const { userId } = await seedUser("search-empty@example.com");
    const result = await searchTransactions(userId, { categoryName: "Nonexistent" });
    expect(result.count).toBe(0);
  });

  it("caps the limit at 25", async () => {
    const { userId } = await seedUser("search-limit@example.com");
    const result = await searchTransactions(userId, { limit: 500 });
    expect(result.count).toBeLessThanOrEqual(25);
  });
});
