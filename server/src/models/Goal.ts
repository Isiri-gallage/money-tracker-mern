import { Schema, model, Types } from "mongoose";

interface IGoal {
  user: Types.ObjectId;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: Date;
  color: string;
  createdAt: Date;
}

const goalSchema = new Schema<IGoal>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  savedAmount: { type: Number, default: 0 },
  targetDate: { type: Date },
  color: { type: String, default: "#8b5cf6" },
  createdAt: { type: Date, default: Date.now },
});

export const Goal = model<IGoal>("Goal", goalSchema);