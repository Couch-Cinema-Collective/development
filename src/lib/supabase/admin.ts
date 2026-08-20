import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses row-level security entirely, so it is
 * only ever used for operations the user genuinely cannot perform themselves —
 * today, deleting their own auth record.
 *
 * The key must never be exposed to the browser: no NEXT_PUBLIC prefix, and the
 * "server-only" import above makes an accidental client import a build error.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Account deletion needs SUPABASE_SERVICE_ROLE_KEY in .env.local " +
        "(Supabase → Project Settings → API Keys → service_role).",
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function adminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
