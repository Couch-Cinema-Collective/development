"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Store (or refresh) the calling member's device token.
 *
 * The token is the primary key, so a device that re-registers updates in place
 * rather than accumulating rows.
 */
export async function registerDeviceToken(
  token: string,
  environment: "production" | "sandbox" = "production",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  if (!token || token.length < 32) return { error: "Invalid device token." };

  const { error } = await supabase.from("device_tokens").upsert(
    {
      token,
      user_id: user.id,
      platform: "ios",
      environment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );

  return error ? { error: error.message } : {};
}
