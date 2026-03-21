import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type UserInfo = {
  id: number;
  username: string;
  displayName: string;
  role: "admin" | "guide";
};

type AuthContextType = {
  user: UserInfo | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Store token in memory (not localStorage - blocked in iframe)
let globalToken: string | null = null;

export function getAuthHeader(): Record<string, string> {
  return globalToken ? { Authorization: `Bearer ${globalToken}` } : {};
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Login failed");
    }
    
    const data = await res.json();
    globalToken = data.token;
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    globalToken = null;
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
