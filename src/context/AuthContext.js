import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Load profile using JWT stored locally
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setUser(null);
        } else {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            // server returns { user }
            setUser(data.user);
          } else {
            setUser(null);
          }
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Login failed');
    // Expecting { token, user }
    if (data.token) localStorage.setItem('auth_token', data.token);
    setUser(data.user || null);
    return data;
  };

  const register = async (email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Registration failed');
    if (data.token) localStorage.setItem('auth_token', data.token);
    setUser(data.user || null);
    return data;
  };

  const logout = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    } catch (_) {}
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
