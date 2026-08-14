/**
 * NEXT_PUBLIC_ vars are inlined at build time, so they must appear as literal
 * property accesses. Publishable-key name preferred; legacy anon-key name
 * accepted.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/** False until .env.local is filled in — lets the site run without a project. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export function requireSupabaseCredentials(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in web/.env.local.",
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}
