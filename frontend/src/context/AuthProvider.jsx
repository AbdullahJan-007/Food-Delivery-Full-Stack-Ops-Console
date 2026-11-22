import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { AuthContext } from './AuthContext';

const TOKEN_KEY = 'fd_token';
const USER_KEY = 'fd_user';

function readStoredUser() {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(readStoredUser);
  const [verifying, setVerifying] = useState(() => Boolean(readStoredToken()));

  const organization = user?.organization ?? null;

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // Ignore storage access errors in restricted browsers
    }
  }, []);

  useEffect(() => {
    api.setUnauthorizedHandler(clearSession);
    return () => api.setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let active = true;
    const initialToken = readStoredToken();
    if (!initialToken) {
      return undefined;
    }

    api
      .getMe(initialToken)
      .then((res) => {
        if (!active) return;
        setUser(res.data);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(res.data));
        } catch {
          // Ignore storage write errors
        }
      })
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setVerifying(false);
      });

    return () => {
      active = false;
    };
  }, [clearSession]);

  const persistSession = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    try {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const updateOrganizationState = useCallback((nextOrg) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, organization: nextOrg };
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  async function login(email, password) {
    const res = await api.login(email, password);
    persistSession(res.data.token, res.data.user);
  }

  async function register(name, email, password, organizationSlug) {
    const res = await api.register(name, email, password, organizationSlug);
    persistSession(res.data.token, res.data.user);
  }

  async function registerOrg(payload) {
    const res = await api.registerOrg(payload);
    persistSession(res.data.token, res.data.user);
  }

  async function logout() {
    const currentToken = token;
    clearSession();
    if (currentToken) {
      try {
        await api.logout(currentToken);
      } catch {
        // Session is already cleared locally
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        verifying,
        login,
        register,
        registerOrg,
        logout,
        updateOrganizationState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
