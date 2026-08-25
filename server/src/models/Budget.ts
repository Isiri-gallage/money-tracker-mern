import { Schema, model, Types } from "mongoose";

interface IBudget {
  user: Types.ObjectId;
  category: Types.ObjectId;
  month: string;
  limit: number;
  createdAt: Date;
}

const budgetSchema = new Schema<IBudget>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  month: { type: String, required: true },
  limit: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

export const Budget = model<IBudget>("Budget", budgetSchema);