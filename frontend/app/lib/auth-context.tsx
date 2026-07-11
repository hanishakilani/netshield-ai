"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

type DecodedToken = {
  sub: string;
  role: string;
  exp: number;
};

type AuthUser = {
  username: string;
  role: string;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

function decodeIfValid(rawToken: string): DecodedToken | null {
  try {
    const decoded = jwtDecode<DecodedToken>(rawToken);
    if (decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("netshield_token");
    if (storedToken) {
      const decoded = decodeIfValid(storedToken);
      if (decoded) {
        setToken(storedToken);
        setUser({ username: decoded.sub, role: decoded.role });
      } else {
        localStorage.removeItem("netshield_token");
      }
    }
    setIsLoading(false);
  }, []);

  async function login(username: string, password: string) {
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Login failed");
    }

    const data = await res.json();
    const decoded = decodeIfValid(data.access_token);
    if (!decoded) throw new Error("Received an invalid token");

    localStorage.setItem("netshield_token", data.access_token);
    setToken(data.access_token);
    setUser({ username: decoded.sub, role: decoded.role });
  }

  function logout() {
    localStorage.removeItem("netshield_token");
    setToken(null);
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider");
  return context;
}