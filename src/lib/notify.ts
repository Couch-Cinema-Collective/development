import "server-only";

import { createAdminClient } from "./supabase/admin";
import { isDeadToken, pushConfigured, sendPush, type PushMessage } from "./apns";

/**
 * Send a push to every device belonging to a set of members, and prune tokens
 * Apple reports as dead.
 *
 * Uses the service-role client: sending is a server concern and the caller is
 * usually acting on behalf of a season, not a user.
 */
export async function notifyMembers(
  userIds: string[],
  message: PushMessage,
): Promise<{ sent: number; pruned: number }> {
  if (!pushConfigured() || userIds.length === 0) return { sent: 0, pruned: 0 };

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("device_tokens")
    .select("token, environment")
    .in("user_id", userIds);

  if (!rows || rows.length === 0) return { sent: 0, pruned: 0 };

  const outcomes = await sendPush(rows, message);

  const dead = outcomes.filter(isDeadToken).map((o) => o.token);
  if (dead.length > 0) {
    await admin.from("device_tokens").delete().in("token", dead);
  }

  return { sent: outcomes.filter((o) => o.ok).length, pruned: dead.length };
}

/** Everyone in a guild — the audience for every season beat. */
export async function guildMemberIds(guildId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("guild_members")
    .select("user_id")
    .eq("guild_id", guildId);
  return (data ?? []).map((r) => r.user_id);
}
