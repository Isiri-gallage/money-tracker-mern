import { Schema, model, Types } from "mongoose";

export type AccountType = "cash" | "bank" | "card" | "other";

interface IAccount {
  user: Types.ObjectId;
  name: string;
  type: AccountType;
  color: string;
  createdAt: Date;
}

const accountSchema = new Schema<IAccount>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["cash", "bank", "card", "other"], default: "cash" },
  color: { type: String, default: "#6366f1" },
  createdAt: { type: Date, default: Date.now },
});

export const Account = model<IAccount>("Account", accountSchema);
