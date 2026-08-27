import { useState } from 'react';
import * as api from '../lib/api';
import { AuthContext } from './AuthContext';

const TOKEN_KEY = 'fd_token';
const USER_KEY = 'fd_user';

function readStoredUser() {
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function AuthProvider({ children }) {
  // Lazy initializers run once, synchronously, on first render. Vite ships a
  // plain client-rendered app (no server render to mismatch against), so
  // there's no reason to defer this into a useEffect the way an SSR
  // framework would need to.
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);

  async function login(email, password) {
    const res = await api.login(email, password);
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem(TOKEN_KEY, res.data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
