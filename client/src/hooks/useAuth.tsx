import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type AuthUser = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to check authentication');
        return response.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signIn: () => {
      window.location.assign(`${API_URL}/auth/google`);
    },
    signOut: async () => {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok && response.status !== 204) throw new Error('Unable to sign out');
      setUser(null);
      localStorage.removeItem('activeDraftId');
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook and provider intentionally share this module so they use one context instance.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
