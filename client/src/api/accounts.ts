import { api } from "./client";

export type AccountType = "cash" | "bank" | "card" | "other";

export interface Account {
  _id: string;
  name: string;
  type: AccountType;
  color: string;
  balance: number;
}

export function getAccounts() {
  return api.get<Account[]>("/accounts");
}

export function createAccount(data: { name: string; type?: AccountType; color?: string }) {
  return api.post<Account>("/accounts", data);
}

export function deleteAccount(id: string) {
  return api.del<void>(`/accounts/${id}`);
}
