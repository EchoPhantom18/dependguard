import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, setAuthToken } from "../api/client.js";


const AuthContext = createContext(null);
const TOKEN_KEY = "dependguard_token";
const USER_KEY = "dependguard_user";


export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const persistSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    setAuthToken(nextToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setAuthToken(null);
  }, []);

  useEffect(() => {
    if (!token || user) return;

    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      })
      .catch(() => logout());
  }, [token, user, logout]);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    persistSession(data.token, data.user);
    return data.user;
  }, [persistSession]);

  const signup = useCallback(async (payload) => {
    const { data } = await api.post("/auth/signup", payload);
    persistSession(data.token, data.user);
    return data.user;
  }, [persistSession]);

  const completeOAuth = useCallback(async (nextToken) => {
    setAuthToken(nextToken);
    const { data } = await api.get("/auth/me");
    persistSession(nextToken, data.user);
    return data.user;
  }, [persistSession]);

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), login, logout, signup, completeOAuth }),
    [token, user, login, logout, signup, completeOAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
