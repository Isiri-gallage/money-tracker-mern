import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const sendMessage = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    chats = { create: vi.fn().mockReturnValue({ sendMessage }) };
  },
}));

const { app } = await import("../app.js");

let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  process.env.GEMINI_API_KEY = "test-key";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
  sendMessage.mockReset();
});

async function seedUser(email = "chat@example.com") {
  const register = await request(app).post("/api/auth/register").send({ email, password: "secret123" });
  return register.body.token as string;
}

describe("POST /api/chat", () => {
  it("rejects an empty message", async () => {
    const token = await seedUser();
    const res = await request(app).post("/api/chat").set("Authorization", `Bearer ${token}`).send({ message: "  " });
    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/chat").send({ message: "hi" });
    expect(res.status).toBe(401);
  });

  it("returns the model's direct reply when no tool call is needed", async () => {
    sendMessage.mockResolvedValueOnce({ functionCalls: undefined, text: "Hello! How can I help with your finances?" });

    const token = await seedUser();
    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "hi" });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Hello! How can I help with your finances?");
  });

  it("executes a tool call and feeds the result back before replying", async () => {
    sendMessage
      .mockResolvedValueOnce({
        functionCalls: [{ id: "1", name: "getSpendingSummary", args: { month: "2026-01" } }],
        text: undefined,
      })
      .mockResolvedValueOnce({ functionCalls: undefined, text: "You had no spending in January." });

    const token = await seedUser();
    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "How much did I spend in January?" });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("You had no spending in January.");
    expect(sendMessage).toHaveBeenCalledTimes(2);

    const secondCallArgs = sendMessage.mock.calls[1][0];
    expect(secondCallArgs.message[0].functionResponse.name).toBe("getSpendingSummary");
    expect(secondCallArgs.message[0].functionResponse.response.output).toEqual({
      month: "2026-01",
      income: 0,
      expense: 0,
      balance: 0,
    });
  });

  it("returns 502 when the model call fails", async () => {
    sendMessage.mockRejectedValueOnce(new Error("upstream down"));

    const token = await seedUser();
    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "hi" });

    expect(res.status).toBe(502);
  });
});
