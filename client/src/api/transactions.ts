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

export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  type?: TxType | "";
  categoryId?: string;
  accountId?: string;
  q?: string;
}

export function getTransactions(filters: TransactionFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return api.get<TransactionPage>(`/transactions${query ? `?${query}` : ""}`);
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
