import { api } from "./client";

export interface CategorySlice {
  name: string;
  total: number;
}

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
}

export interface Overview {
  month: string;
  byCategory: CategorySlice[];
  monthly: MonthlyPoint[];
}

export function getOverview(month?: string) {
  return api.get<Overview>(`/stats/overview${month ? `?month=${month}` : ""}`);
}
