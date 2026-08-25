import { useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import type { User } from "../api/auth";
import type { CurrencyCode } from "../lib/currencies";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  function saveSession(token: string, user: User) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  }

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password);
    saveSession(res.token, res.user);
  }

  async function register(email: string, password: string) {
    const res = await authApi.register(email, password);
    saveSession(res.token, res.user);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  async function updateCurrency(currency: CurrencyCode) {
    const updated = await authApi.updateCurrency(currency);
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, updateCurrency }}>
      {children}
    </AuthContext.Provider>
  );
}
