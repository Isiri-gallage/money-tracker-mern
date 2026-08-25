import { api } from "./client";

export type TxType = "income" | "expense";

export interface Category {
  _id: string;
  name: string;
  type: TxType;
  color: string;
}

export function getCategories() {
  return api.get<Category[]>("/categories");
}

export function createCategory(data: { name: string; type: TxType; color?: string }) {
  return api.post<Category>("/categories", data);
}

export function deleteCategory(id: string) {
  return api.del<void>(`/categories/${id}`);
}