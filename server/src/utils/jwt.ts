import jwt from "jsonwebtoken";
import type { Types } from "mongoose";

export function signToken(userId: Types.ObjectId | string) {
  const JWT_SECRET = process.env.JWT_SECRET as string;
  return jwt.sign({ sub: userId.toString() }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { sub: string } {
  const JWT_SECRET = process.env.JWT_SECRET as string;
  return jwt.verify(token, JWT_SECRET) as { sub: string };
}