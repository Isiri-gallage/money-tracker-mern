import { api } from "./client";
import type { TxType } from "./categories";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export interface RecurringTransaction {
  _id: string;
  account: string;
  category?: string;
  amount: number;
  type: TxType;
  description: string;
  frequency: RecurrenceFrequency;
  nextRunDate: string;
  lastRunDate?: string;
  active: boolean;
}

export function getRecurring() {
  return api.get<RecurringTransaction[]>("/recurring");
}

export function createRecurring(data: {
  accountId: string;
  categoryId?: string;
  amount: number;
  type: TxType;
  description?: string;
  frequency: RecurrenceFrequency;
  startDate?: string;
}) {
  return api.post<RecurringTransaction>("/recurring", data);
}

export function setRecurringActive(id: string, active: boolean) {
  return api.patch<RecurringTransaction>(`/recurring/${id}`, { active });
}

export function deleteRecurring(id: string) {
  return api.del<void>(`/recurring/${id}`);
}

export function updateRecurring(
  id: string,
  data: Partial<{
    accountId: string;
    categoryId: string;
    amount: number;
    type: TxType;
    description: string;
    frequency: RecurrenceFrequency;
    startDate: string;
  }>,
) {
  return api.patch<RecurringTransaction>(`/recurring/${id}`, data);
}