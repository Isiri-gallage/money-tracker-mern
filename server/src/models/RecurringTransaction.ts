import { Schema, model, Types } from "mongoose";
import type { TxType } from "./Category.js";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

interface IRecurringTransaction {
  user: Types.ObjectId;
  account: Types.ObjectId;
  category?: Types.ObjectId;
  amount: number;
  type: TxType;
  description: string;
  frequency: RecurrenceFrequency;
  nextRunDate: Date;
  lastRunDate?: Date;
  active: boolean;
  createdAt: Date;
}

const recurringTransactionSchema = new Schema<IRecurringTransaction>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
  category: { type: Schema.Types.ObjectId, ref: "Category" },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  description: { type: String, default: "" },
  frequency: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
  nextRunDate: { type: Date, required: true, index: true },
  lastRunDate: { type: Date },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export const RecurringTransaction = model<IRecurringTransaction>("RecurringTransaction", recurringTransactionSchema);