import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client — used only for Auth (sign up / in / out, session).
 * All data access goes through the backend API, which holds the service role.
 * The URL + publishable key are public by design; RLS protects the data.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly in dev rather than silently rendering a broken auth flow.
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
