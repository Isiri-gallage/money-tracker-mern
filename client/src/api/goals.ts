import { api } from "./client";

export interface Goal {
  _id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
  color: string;
  createdAt: string;
}

export function getGoals() {
  return api.get<Goal[]>("/goals");
}

export function createGoal(data: { name: string; targetAmount: number; targetDate?: string; color?: string }) {
  return api.post<Goal>("/goals", data);
}

export function contributeToGoal(id: string, amount: number) {
  return api.post<Goal>(`/goals/${id}/contribute`, { amount });
}

export function deleteGoal(id: string) {
  return api.del<void>(`/goals/${id}`);
}