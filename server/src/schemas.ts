import { z } from "zod";
import { CURRENCIES } from "./constants.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "must be a valid id");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("must be a valid email"),
  password: z.string().min(6, "password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("must be a valid email"),
  password: z.string().min(1, "password is required"),
});

export const updateMeSchema = z.object({
  currency: z.enum(CURRENCIES),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  type: z.enum(["income", "expense"]),
  color: z.string().trim().optional(),
});

export const accountSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  type: z.enum(["cash", "bank", "card", "other"]).optional(),
  color: z.string().trim().optional(),
});

export const transactionSchema = z.object({
  amount: z.number().positive("amount must be a positive number"),
  type: z.enum(["income", "expense"]),
  description: z.string().trim().optional(),
  date: z.string().optional(),
  categoryId: objectId.optional(),
  accountId: objectId,
});

export const transactionUpdateSchema = z.object({
  amount: z.number().positive("amount must be a positive number").optional(),
  type: z.enum(["income", "expense"]).optional(),
  description: z.string().trim().optional(),
  date: z.string().optional(),
  categoryId: objectId.optional(),
  accountId: objectId.optional(),
});

export const budgetSchema = z.object({
  categoryId: objectId,
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be in YYYY-MM format"),
  limit: z.number().positive("limit must be a positive number"),
});

export const recurringSchema = z.object({
  accountId: objectId,
  categoryId: objectId.optional(),
  amount: z.number().positive("amount must be a positive number"),
  type: z.enum(["income", "expense"]),
  description: z.string().trim().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  startDate: z.string().optional(),
});

export const recurringUpdateSchema = z.object({
  accountId: objectId.optional(),
  categoryId: objectId.optional(),
  amount: z.number().positive("amount must be a positive number").optional(),
  type: z.enum(["income", "expense"]).optional(),
  description: z.string().trim().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  startDate: z.string().optional(),
  active: z.boolean().optional(),
});

export const chatSchema = z.object({
  message: z.string().trim().min(1, "message is required"),
  history: z
    .array(z.object({ role: z.enum(["user", "model"]), text: z.string() }))
    .optional()
    .default([]),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  targetAmount: z.number().positive("targetAmount must be a positive number"),
  targetDate: z.string().optional(),
  color: z.string().trim().optional(),
});

export const goalUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().optional(),
  color: z.string().trim().optional(),
});

export const goalContributionSchema = z.object({
  amount: z.number().refine((n) => n !== 0, "amount cannot be zero"),
});

export const csvPreviewSchema = z.object({
  csvText: z.string().min(1, "csvText is required"),
});

const csvImportRowSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
});

export const csvCommitSchema = z.object({
  accountId: objectId,
  categoryId: objectId.optional(),
  transactions: z.array(csvImportRowSchema).min(1, "at least one transaction is required"),
});