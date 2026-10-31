import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from "./authService";
import { AuthContext, type AuthStatus } from "./AuthContext";
import type { AuthUser } from "./authService";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState("");

  const refreshSession = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setStatus(currentUser ? "authenticated" : "anonymous");
    } catch (requestError) {
      setUser(null);
      setStatus("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to check your sign-in session.",
      );
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSession();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      setError("");
      const authenticatedUser = await loginRequest(username, password);
      setUser(authenticatedUser);
      setStatus("authenticated");
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    setStatus("anonymous");
    setError("");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      login,
      logout,
      refreshSession,
    }),
    [user, status, error, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
