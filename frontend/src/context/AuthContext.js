'use client';

/**
 * Place at: frontend/src/context/AuthContext.js
 *
 * Usage:
 *   layout.js        → <AuthProvider>{children}</AuthProvider>
 *   any client comp  → const { user, login, register, logout, loading } = useAuth();
 *
 * The backend sets an httpOnly cookie on login/register, so the token itself
 * is never touched or stored on the client. Every request that should carry
 * it uses `credentials: 'include'`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_URL } from '@/lib/imageUrl';

const AuthContext = createContext(null);

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until the initial /me check finishes

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
      if (!res.ok) {
        setUser(null);
        return null;
      }
      const data = await parseJson(res);
      setUser(data.user || null);
      return data.user || null;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.message || 'Failed to sign in');
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.message || 'Failed to create account');
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refresh,
    }),
    [user, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}