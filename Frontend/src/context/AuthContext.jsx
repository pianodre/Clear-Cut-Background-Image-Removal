import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { fetchMe } from "../lib/api.js";

/**
 * Real auth, backed by Supabase. The hook keeps the same shape the app already
 * uses ({ user, isAuthenticated, login, signup, logout }) so pages didn't need
 * to change. `user` merges the Supabase session with the profile (credits/plan)
 * loaded from the backend's /api/me. `loading` is true until the initial session
 * is resolved, so a refresh doesn't flash logged-in users back to /login.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load the profile (credits/plan) for the current session; clear on failure.
  async function loadProfile() {
    try {
      setProfile(await fetchMe());
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile();
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession) await loadProfile();
      else setProfile(null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const user = useMemo(() => {
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: profile?.full_name || session.user.email?.split("@")[0],
      plan: profile?.plan ?? "payg",
      credits: profile?.credits ?? 0,
    };
  }, [session, profile]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(session?.user),

      async login({ email, password }) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        await loadProfile();
      },

      async signup({ name, email, password }) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw new Error(error.message);
        // With email confirmation on, signUp returns no session until confirmed.
        if (data.session) {
          await loadProfile();
          return { needsConfirmation: false };
        }
        return { needsConfirmation: true };
      },

      async logout() {
        await supabase.auth.signOut();
      },

      refreshProfile: loadProfile,
    }),
    [user, loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
