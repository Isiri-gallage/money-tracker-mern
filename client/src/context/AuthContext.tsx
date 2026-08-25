import { createContext } from "react";
import type { User } from "../api/auth";
import type { CurrencyCode } from "../lib/currencies";

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateCurrency: (currency: CurrencyCode) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
