import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireSupabaseCredentials } from "./config";

/**
 * Server-side Supabase client for Server Components, Server Actions, and Route
 * Handlers. Reads the auth session from request cookies; must be created per
 * request (never cached in a module global).
 */
export async function createClient() {
  const { url, key } = requireSupabaseCredentials();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: the proxy refreshes sessions before render.
        }
      },
    },
  });
}
