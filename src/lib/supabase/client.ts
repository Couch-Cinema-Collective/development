import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseCredentials } from "./config";

/**
 * Browser-side Supabase client. Only ever holds the publishable key, which is
 * safe to ship to the client — row access is enforced by RLS, not by the key.
 */
export function createClient() {
  const { url, key } = requireSupabaseCredentials();
  return createBrowserClient(url, key);
}
