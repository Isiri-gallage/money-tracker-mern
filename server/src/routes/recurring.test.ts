import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";
import { RecurringTransaction } from "../models/RecurringTransaction.js";
import { runDueRecurringTransactions, advance } from "../services/recurring.js";

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

async function registerAndGetSession(email = "recurring-test@example.com") {
  const res = await request(app).post("/api/auth/register").send({ email, password: "secret123" });
  const token = res.body.token as string;

  const accounts = await request(app).get("/api/accounts").set("Authorization", `Bearer ${token}`);
  const accountId = accounts.body[0]._id as string;

  return { token, accountId };
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe("POST /api/recurring", () => {
  it("creates a recurring transaction", async () => {
    const { token, accountId } = await registerAndGetSession();
    const res = await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({ accountId, amount: 12.99, type: "expense", description: "Netflix", frequency: "monthly" });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe("Netflix");
    expect(res.body.active).toBe(true);
  });

  it("rejects an invalid frequency", async () => {
    const { token, accountId } = await registerAndGetSession();
    const res = await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({ accountId, amount: 10, type: "expense", frequency: "hourly" });

    expect(res.status).toBe(400);
  });

  it("rejects an accountId belonging to another user", async () => {
    const { token: tokenA } = await registerAndGetSession("owner6@example.com");
    const { accountId: accountB } = await registerAndGetSession("intruder6@example.com");

    const res = await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ accountId: accountB, amount: 10, type: "expense", frequency: "daily" });

    expect(res.status).toBe(400);
  });
});

describe("runDueRecurringTransactions", () => {
  it("generates a transaction when one is due", async () => {
    const { token, accountId } = await registerAndGetSession();
    await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({
        accountId,
        amount: 50,
        type: "expense",
        description: "Gym",
        frequency: "monthly",
        startDate: new Date(Date.now() - DAY_MS).toISOString(),
      });

    const created = await runDueRecurringTransactions();
    expect(created).toBe(1);

    const txs = await request(app).get("/api/transactions").set("Authorization", `Bearer ${token}`);
    expect(txs.body.items).toHaveLength(1);
    expect(txs.body.items[0].description).toBe("Gym");
  });

  it("does not generate anything before the due date", async () => {
    const { token, accountId } = await registerAndGetSession();
    await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({
        accountId,
        amount: 50,
        type: "expense",
        frequency: "daily",
        startDate: new Date(Date.now() + DAY_MS).toISOString(),
      });

    const created = await runDueRecurringTransactions();
    expect(created).toBe(0);
  });

  it("catches up on every missed occurrence", async () => {
    const { token, accountId } = await registerAndGetSession();
    await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({
        accountId,
        amount: 5,
        type: "expense",
        frequency: "daily",
        startDate: new Date(Date.now() - 3 * DAY_MS).toISOString(),
      });

    // 3 days overdue on a daily schedule: the 3 missed days plus today
    const created = await runDueRecurringTransactions();
    expect(created).toBe(4);

    const txs = await request(app).get("/api/transactions").set("Authorization", `Bearer ${token}`);
    expect(txs.body.items).toHaveLength(4);
  });

  it("skips inactive recurring transactions", async () => {
    const { token, accountId } = await registerAndGetSession();
    const created = await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({
        accountId,
        amount: 5,
        type: "expense",
        frequency: "daily",
        startDate: new Date(Date.now() - DAY_MS).toISOString(),
      });

    await request(app)
      .patch(`/api/recurring/${created.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: false });

    expect(await runDueRecurringTransactions()).toBe(0);
  });

  it("advances nextRunDate past now after running", async () => {
    const { token, accountId } = await registerAndGetSession();
    await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({
        accountId,
        amount: 5,
        type: "expense",
        frequency: "weekly",
        startDate: new Date(Date.now() - DAY_MS).toISOString(),
      });

    await runDueRecurringTransactions();

    const item = await RecurringTransaction.findOne({});
    expect(item!.nextRunDate.getTime()).toBeGreaterThan(Date.now());
    expect(item!.lastRunDate).toBeDefined();

    // running again immediately must not double-charge
    expect(await runDueRecurringTransactions()).toBe(0);
  });
});

describe("advance()", () => {
  it("adds a day, a week, and a month", () => {
    const base = new Date("2026-03-10T00:00:00Z");
    expect(advance(base, "daily").toISOString().slice(0, 10)).toBe("2026-03-11");
    expect(advance(base, "weekly").toISOString().slice(0, 10)).toBe("2026-03-17");
    expect(advance(base, "monthly").toISOString().slice(0, 10)).toBe("2026-04-10");
  });

  it("clamps Jan 31 to the last day of February instead of rolling into March", () => {
    const jan31 = new Date(2026, 0, 31);
    const next = advance(jan31, "monthly");
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });
});

describe("DELETE /api/recurring/:id", () => {
  it("refuses to delete another user's recurring transaction", async () => {
    const { token: tokenA, accountId } = await registerAndGetSession("owner7@example.com");
    const { token: tokenB } = await registerAndGetSession("intruder7@example.com");

    const created = await request(app)
      .post("/api/recurring")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ accountId, amount: 10, type: "expense", frequency: "daily" });

    const res = await request(app)
      .delete(`/api/recurring/${created.body._id}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});