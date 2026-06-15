import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Mock auth so the full sign-up → login → dashboard → tool flow is clickable
 * before any real backend exists. The "session" is just a user object kept in
 * localStorage. Swap the body of login/signup/logout for real API calls later;
 * the rest of the app only depends on this hook's shape.
 */
const AuthContext = createContext(null);

const STORAGE_KEY = "clearcut.user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      // Fake network latency so loading states are visible in the prototype.
      async login({ email }) {
        await new Promise((r) => setTimeout(r, 500));
        const next = {
          email,
          name: email.split("@")[0],
          plan: "Starter",
          credits: 50,
        };
        setUser(next);
        return next;
      },
      async signup({ name, email }) {
        await new Promise((r) => setTimeout(r, 600));
        const next = { email, name: name || email.split("@")[0], plan: "Pay as you go", credits: 0 };
        setUser(next);
        return next;
      },
      logout() {
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
