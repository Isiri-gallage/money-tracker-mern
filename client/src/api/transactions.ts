
import type { TxType } from "./categories";
import { api, BASE_URL, getToken } from "./client";

export async function exportTransactionsCsv(filters: TransactionFilters = {}): Promise<void> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  const token = getToken();

  const res = await fetch(`${BASE_URL}/transactions/export${query ? `?${query}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error("Failed to export transactions");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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

export interface ImportRow {
  rowIndex: number;
  date: string;
  description: string;
  amount: number;
  type: TxType;
  duplicate: boolean;
}

export interface ImportPreview {
  rows: ImportRow[];
  skipped: { rowIndex: number; reason: string }[];
}

export function previewCsvImport(csvText: string) {
  return api.post<ImportPreview>("/transactions/import/preview", { csvText });
}

export function commitCsvImport(data: {
  accountId: string;
  categoryId?: string;
  transactions: Array<{ date: string; description: string; amount: number; type: TxType }>;
}) {
  return api.post<{ created: number }>("/transactions/import/commit", data);
}

export function updateTransaction(
  id: string,
  data: Partial<{
    amount: number;
    type: TxType;
    description: string;
    date: string;
    categoryId: string;
    accountId: string;
  }>,
) {
  return api.patch<Transaction>(`/transactions/${id}`, data);
}