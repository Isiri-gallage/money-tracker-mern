import { api } from "./client";
import type { TxType } from "./categories";

export interface Transaction {
  _id: string;
  amount: number;
  type: TxType;
  description: string;
  date: string;
  account: string;
  category?: string;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: Record<string, number>;
}

export function getTransactions() {
  return api.get<Transaction[]>("/transactions");
}

export function createTransaction(data: {
  amount: number;
  type: TxType;
  description?: string;
  date?: string;
  categoryId?: string;
  accountId: string;
}) {
  return api.post<Transaction>("/transactions", data);
}

export function deleteTransaction(id: string) {
  return api.del<void>(`/transactions/${id}`);
}

export function getSummary() {
  return api.get<Summary>("/transactions/summary");
}
