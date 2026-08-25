import { Schema, model } from "mongoose";
import { CURRENCIES, type CurrencyCode } from "../constants.js";

interface IUser {
  email: string;
  passwordHash: string;
  currency: CurrencyCode;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  currency: { type: String, enum: CURRENCIES, default: "USD" },
  createdAt: { type: Date, default: Date.now },
});

export const User = model<IUser>("User", userSchema);
