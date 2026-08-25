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

describe("POST /api/auth/register", () => {
  it("creates a user and returns a token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@example.com", password: "secret123" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("a@example.com");
  });

  it("rejects a duplicate email", async () => {
    await request(app).post("/api/auth/register").send({ email: "a@example.com", password: "secret123" });
    const res = await request(app).post("/api/auth/register").send({ email: "a@example.com", password: "secret123" });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials", async () => {
    await request(app).post("/api/auth/register").send({ email: "b@example.com", password: "secret123" });
    const res = await request(app).post("/api/auth/login").send({ email: "b@example.com", password: "secret123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects a wrong password", async () => {
    await request(app).post("/api/auth/register").send({ email: "c@example.com", password: "secret123" });
    const res = await request(app).post("/api/auth/login").send({ email: "c@example.com", password: "wrongpass" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("defaults currency to USD for a new user", async () => {
    const { body } = await request(app).post("/api/auth/register").send({ email: "d@example.com", password: "secret123" });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.currency).toBe("USD");
  });

  it("rejects requests with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/auth/me", () => {
  it("updates the user's currency", async () => {
    const { body } = await request(app).post("/api/auth/register").send({ email: "e@example.com", password: "secret123" });
    const res = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ currency: "LKR" });

    expect(res.status).toBe(200);
    expect(res.body.currency).toBe("LKR");
  });

  it("rejects an unsupported currency code", async () => {
    const { body } = await request(app).post("/api/auth/register").send({ email: "f@example.com", password: "secret123" });
    const res = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ currency: "XXX" });

    expect(res.status).toBe(400);
  });
});