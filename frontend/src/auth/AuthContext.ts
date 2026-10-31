import { createContext } from "react";
import type { AuthUser } from "./authService";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "anonymous"
  | "error";

export type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  error: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
