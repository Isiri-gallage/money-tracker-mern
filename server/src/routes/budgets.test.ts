import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";

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

async function registerAndGetSession(email = "budget-test@example.com") {
  const res = await request(app).post("/api/auth/register").send({ email, password: "secret123" });
  const token = res.body.token as string;

  const accounts = await request(app).get("/api/accounts").set("Authorization", `Bearer ${token}`);
  const accountId = accounts.body[0]._id as string;

  return { token, accountId };
}

describe("POST /api/budgets", () => {
  it("creates a budget for a category and month", async () => {
    const { token } = await registerAndGetSession();
    const category = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Groceries", type: "expense" });

    const res = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.body._id, month: "2026-08", limit: 300 });

    expect(res.status).toBe(201);
    expect(res.body.limit).toBe(300);
  });

  it("upserts instead of creating a duplicate for the same category+month", async () => {
    const { token } = await registerAndGetSession();
    const category = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Groceries", type: "expense" });

    await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.body._id, month: "2026-08", limit: 300 });

    await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.body._id, month: "2026-08", limit: 450 });

    const res = await request(app).get("/api/budgets?month=2026-08").set("Authorization", `Bearer ${token}`);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].limit).toBe(450);
  });

  it("rejects an invalid month format", async () => {
    const { token } = await registerAndGetSession();
    const category = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Groceries", type: "expense" });

    const res = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.body._id, month: "Aug-2026", limit: 300 });

    expect(res.status).toBe(400);
  });

  it("rejects a non-positive limit", async () => {
    const { token } = await registerAndGetSession();
    const category = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Groceries", type: "expense" });

    const res = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.body._id, month: "2026-08", limit: 0 });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/budgets", () => {
  it("computes spent and remaining from that month's expense transactions", async () => {
    const { token, accountId } = await registerAndGetSession();
    const category = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Groceries", type: "expense" });

    await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.body._id, month: "2026-08", limit: 300 });

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 120, type: "expense", categoryId: category.body._id, accountId, date: "2026-08-15" });

    const res = await request(app).get("/api/budgets?month=2026-08").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body[0].spent).toBe(120);
    expect(res.body[0].remaining).toBe(180);
  });

  it("excludes transactions from a different month", async () => {
    const { token, accountId } = await registerAndGetSession();
    const category = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Groceries", type: "expense" });

    await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.body._id, month: "2026-08", limit: 300 });

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 120, type: "expense", categoryId: category.body._id, accountId, date: "2026-07-15" });

    const res = await request(app).get("/api/budgets?month=2026-08").set("Authorization", `Bearer ${token}`);

    expect(res.body[0].spent).toBe(0);
  });
});

describe("DELETE /api/budgets/:id", () => {
  it("refuses to delete another user's budget", async () => {
    const { token: tokenA } = await registerAndGetSession("owner5@example.com");
    const { token: tokenB } = await registerAndGetSession("intruder5@example.com");

    const category = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Groceries", type: "expense" });

    const budget = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ categoryId: category.body._id, month: "2026-08", limit: 300 });

    const res = await request(app)
      .delete(`/api/budgets/${budget.body._id}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});