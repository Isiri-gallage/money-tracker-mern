import { Schema, model, Types } from "mongoose";
import type { TxType } from "./Category.js";

interface ITransaction {
  user: Types.ObjectId;
  account: Types.ObjectId;
  category?: Types.ObjectId;
  amount: number;
  type: TxType;
  description: string;
  date: Date;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  account: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
  category: { type: Schema.Types.ObjectId, ref: "Category" },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  description: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export const Transaction = model<ITransaction>("Transaction", transactionSchema);
