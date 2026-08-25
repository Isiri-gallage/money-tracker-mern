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

async function registerAndGetToken(email = "cat-test@example.com") {
  const res = await request(app).post("/api/auth/register").send({ email, password: "secret123" });
  return res.body.token as string;
}

describe("GET /api/categories", () => {
  it("rejects requests with no auth token", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(401);
  });

  it("returns an empty list for a new user", async () => {
    const token = await registerAndGetToken();
    const res = await request(app).get("/api/categories").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /api/categories", () => {
  it("creates a category for the logged-in user", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Groceries", type: "expense", color: "#4CAF50" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Groceries");
    expect(res.body.type).toBe("expense");
  });

  it("rejects a missing name", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "expense" });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/categories/:id", () => {
  it("deletes a category owned by the user", async () => {
    const token = await registerAndGetToken();
    const created = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rent", type: "expense" });

    const res = await request(app)
      .delete(`/api/categories/${created.body._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("refuses to delete another user's category", async () => {
    const tokenA = await registerAndGetToken("owner@example.com");
    const tokenB = await registerAndGetToken("intruder@example.com");

    const created = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Rent", type: "expense" });

    const res = await request(app)
      .delete(`/api/categories/${created.body._id}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});