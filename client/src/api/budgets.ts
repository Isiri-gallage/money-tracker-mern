import { api } from "./client";

export interface Budget {
  _id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  month: string;
  limit: number;
  spent: number;
  remaining: number;
}

export function getBudgets(month: string) {
  return api.get<Budget[]>(`/budgets?month=${month}`);
}

export function upsertBudget(data: { categoryId: string; month: string; limit: number }) {
  return api.post<Budget>("/budgets", data);
}

export function deleteBudget(id: string) {
  return api.del<void>(`/budgets/${id}`);
}