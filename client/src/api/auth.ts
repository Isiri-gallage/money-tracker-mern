import { api } from "./client";
import type { CurrencyCode } from "../lib/currencies";

export interface User {
  id: string;
  email: string;
  currency: CurrencyCode;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export function register(email: string, password: string) {
  return api.post<AuthResponse>("/auth/register", { email, password });
}

export function login(email: string, password: string) {
  return api.post<AuthResponse>("/auth/login", { email, password });
}

export function getMe() {
  return api.get<User>("/auth/me");
}

export function updateCurrency(currency: CurrencyCode) {
  return api.patch<User>("/auth/me", { currency });
}
