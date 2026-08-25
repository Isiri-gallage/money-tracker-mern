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

async function registerAndGetToken(email = "acct-test@example.com") {
  const res = await request(app).post("/api/auth/register").send({ email, password: "secret123" });
  return res.body.token as string;
}

describe("GET /api/accounts", () => {
  it("gives a new user a default Cash account with zero balance", async () => {
    const token = await registerAndGetToken();
    const res = await request(app).get("/api/accounts").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Cash");
    expect(res.body[0].balance).toBe(0);
  });
});

describe("POST /api/accounts", () => {
  it("creates a new account", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Chase Checking", type: "bank" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Chase Checking");
    expect(res.body.balance).toBe(0);
  });

  it("rejects a missing name", async () => {
    const token = await registerAndGetToken();
    const res = await request(app).post("/api/accounts").set("Authorization", `Bearer ${token}`).send({ type: "bank" });

    expect(res.status).toBe(400);
  });
});

describe("account balances", () => {
  it("reflects income and expense transactions correctly", async () => {
    const token = await registerAndGetToken();
    const accounts = await request(app).get("/api/accounts").set("Authorization", `Bearer ${token}`);
    const accountId = accounts.body[0]._id;

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1000, type: "income", accountId });

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 150, type: "expense", accountId });

    const res = await request(app).get("/api/accounts").set("Authorization", `Bearer ${token}`);

    expect(res.body[0].balance).toBe(850);
  });

  it("keeps balances separate per account", async () => {
    const token = await registerAndGetToken();
    const cash = await request(app).get("/api/accounts").set("Authorization", `Bearer ${token}`);
    const cashId = cash.body[0]._id;

    const bank = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bank", type: "bank" });
    const bankId = bank.body._id;

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 100, type: "income", accountId: cashId });

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 500, type: "income", accountId: bankId });

    const res = await request(app).get("/api/accounts").set("Authorization", `Bearer ${token}`);
    const byId = Object.fromEntries(res.body.map((a: { _id: string; balance: number }) => [a._id, a.balance]));

    expect(byId[cashId]).toBe(100);
    expect(byId[bankId]).toBe(500);
  });
});

describe("DELETE /api/accounts/:id", () => {
  it("deletes an account with no transactions", async () => {
    const token = await registerAndGetToken();
    const created = await request(app)
      .post("/api/accounts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unused", type: "other" });

    const res = await request(app)
      .delete(`/api/accounts/${created.body._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("refuses to delete an account that has transactions", async () => {
    const token = await registerAndGetToken();
    const accounts = await request(app).get("/api/accounts").set("Authorization", `Bearer ${token}`);
    const accountId = accounts.body[0]._id;

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 10, type: "expense", accountId });

    const res = await request(app).delete(`/api/accounts/${accountId}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it("refuses to delete another user's account", async () => {
    const tokenA = await registerAndGetToken("owner4@example.com");
    const tokenB = await registerAndGetToken("intruder4@example.com");

    const accountsA = await request(app).get("/api/accounts").set("Authorization", `Bearer ${tokenA}`);

    const res = await request(app)
      .delete(`/api/accounts/${accountsA.body[0]._id}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});
