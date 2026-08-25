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

async function registerAndGetSession(email = "tx-test@example.com") {
  const res = await request(app).post("/api/auth/register").send({ email, password: "secret123" });
  const token = res.body.token as string;

  const accounts = await request(app).get("/api/accounts").set("Authorization", `Bearer ${token}`);
  const accountId = accounts.body[0]._id as string;

  return { token, accountId };
}

describe("POST /api/transactions", () => {
  it("creates a transaction for the logged-in user", async () => {
    const { token, accountId } = await registerAndGetSession();
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 45.5, type: "expense", description: "Groceries", accountId });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(45.5);
    expect(res.body.type).toBe("expense");
  });

  it("rejects a missing amount", async () => {
    const { token, accountId } = await registerAndGetSession();
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "expense", accountId });

    expect(res.status).toBe(400);
  });

  it("rejects a missing accountId", async () => {
    const { token } = await registerAndGetSession();
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 10, type: "expense" });

    expect(res.status).toBe(400);
  });

  it("rejects an accountId belonging to another user", async () => {
    const { token: tokenA } = await registerAndGetSession("owner3@example.com");
    const { accountId: accountB } = await registerAndGetSession("intruder3@example.com");

    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ amount: 10, type: "expense", accountId: accountB });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/transactions", () => {
  it("only returns the logged-in user's transactions", async () => {
    const { token: tokenA, accountId: accountA } = await registerAndGetSession("a@example.com");
    const { token: tokenB, accountId: accountB } = await registerAndGetSession("b@example.com");

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ amount: 10, type: "expense", accountId: accountA });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ amount: 20, type: "income", accountId: accountB });

    const res = await request(app).get("/api/transactions").set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].amount).toBe(10);
  });
});

describe("GET /api/transactions/summary", () => {
  it("computes totals and groups by category", async () => {
    const { token, accountId } = await registerAndGetSession();

    const category = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Groceries", type: "expense" });

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 45.5, type: "expense", categoryId: category.body._id, accountId });

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1000, type: "income", accountId });

    const res = await request(app).get("/api/transactions/summary").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBe(1000);
    expect(res.body.totalExpense).toBe(45.5);
    expect(res.body.balance).toBe(954.5);
    expect(res.body.byCategory.Groceries).toBe(45.5);
  });
});

describe("DELETE /api/transactions/:id", () => {
  it("refuses to delete another user's transaction", async () => {
    const { token: tokenA, accountId } = await registerAndGetSession("owner2@example.com");
    const { token: tokenB } = await registerAndGetSession("intruder2@example.com");

    const created = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ amount: 10, type: "expense", accountId });

    const res = await request(app)
      .delete(`/api/transactions/${created.body._id}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});
