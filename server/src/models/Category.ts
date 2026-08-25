import { Schema, model, Types } from "mongoose";

export type TxType = "income" | "expense";

interface ICategory {
  user: Types.ObjectId;
  name: string;
  type: TxType;
  color: string;
}

const categorySchema = new Schema<ICategory>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  color: { type: String, default: "#C9A15C" },
});

export const Category = model<ICategory>("Category", categorySchema);