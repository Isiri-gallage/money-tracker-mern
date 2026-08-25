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

async function session(email = "stats@example.com") {
  const res = await request(app).post("/api/auth/register").send({ email, password: "secret123" });
  const token = res.body.token as string;
  const accounts = await request(app).get("/api/accounts").set("Authorization", `Bearer ${token}`);
  return { token, accountId: accounts.body[0]._id as string };
}

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

describe("GET /api/stats/overview", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/stats/overview");
    expect(res.status).toBe(401);
  });

  it("returns six trend months, oldest first", async () => {
    const { token } = await session();
    const res = await request(app).get("/api/stats/overview").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.monthly).toHaveLength(6);
    expect(res.body.monthly[5].month).toBe(thisMonth());
    expect(res.body.monthly[0].month < res.body.monthly[5].month).toBe(true);
  });

  it("groups this month's expenses by category name", async () => {
    const { token, accountId } = await session();

    const category = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Groceries", type: "expense" });

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 60, type: "expense", accountId, categoryId: category.body._id });

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 40, type: "expense", accountId });

    const res = await request(app).get("/api/stats/overview").set("Authorization", `Bearer ${token}`);

    const byName = Object.fromEntries(
      res.body.byCategory.map((c: { name: string; total: number }) => [c.name, c.total]),
    );
    expect(byName.Groceries).toBe(60);
    expect(byName.Uncategorized).toBe(40);
  });

  it("excludes income from the category breakdown", async () => {
    const { token, accountId } = await session();

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 5000, type: "income", accountId });

    const res = await request(app).get("/api/stats/overview").set("Authorization", `Bearer ${token}`);

    expect(res.body.byCategory).toHaveLength(0);
  });

  it("sorts the category breakdown by amount descending", async () => {
    const { token, accountId } = await session();

    for (const [name, amount] of [
      ["Rent", 1200],
      ["Food", 300],
      ["Fuel", 700],
    ] as const) {
      const category = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${token}`)
        .send({ name, type: "expense" });
      await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount, type: "expense", accountId, categoryId: category.body._id });
    }

    const res = await request(app).get("/api/stats/overview").set("Authorization", `Bearer ${token}`);
    expect(res.body.byCategory.map((c: { name: string }) => c.name)).toEqual(["Rent", "Fuel", "Food"]);
  });

  it("splits income and expense per month in the trend", async () => {
    const { token, accountId } = await session();

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 2000, type: "income", accountId });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 750, type: "expense", accountId });

    const res = await request(app).get("/api/stats/overview").set("Authorization", `Bearer ${token}`);
    const current = res.body.monthly[5];

    expect(current.income).toBe(2000);
    expect(current.expense).toBe(750);
  });

  it("keeps one user's stats out of another's", async () => {
    const { token: tokenA, accountId } = await session("sa@example.com");
    const { token: tokenB } = await session("sb@example.com");

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ amount: 500, type: "expense", accountId });

    const res = await request(app).get("/api/stats/overview").set("Authorization", `Bearer ${tokenB}`);
    expect(res.body.byCategory).toHaveLength(0);
    expect(res.body.monthly[5].expense).toBe(0);
  });
});
