import "server-only";

import { createAdminClient } from "./supabase/admin";
import { isDeadToken, pushConfigured, sendPush, type PushMessage } from "./apns";

/**
 * Send a push to every device belonging to a set of members.
 *
 * Uses the service-role client: sending is a server concern and the caller is
 * usually acting on behalf of a festival, not a user.
 */
export async function notifyMembers(
  userIds: string[],
  message: PushMessage,
): Promise<{ sent: number; pruned: number; corrected: number }> {
  if (!pushConfigured() || userIds.length === 0) {
    return { sent: 0, pruned: 0, corrected: 0 };
  }

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("device_tokens")
    .select("token, environment")
    .in("user_id", userIds);

  if (!rows || rows.length === 0) return { sent: 0, pruned: 0, corrected: 0 };

  const outcomes = await sendPush(rows, message);

  /*
   * A token registered by a build installed from Xcode is a *sandbox* token;
   * TestFlight and App Store builds produce *production* ones. The device
   * cannot tell the web layer which it is, so a token stored under the wrong
   * environment comes back BadDeviceToken and looks identical to a token that
   * has genuinely expired.
   *
   * Rather than make anyone configure that, retry the other environment once.
   * If it lands, the stored environment was simply wrong and gets corrected;
   * if it fails too, the token really is dead.
   */
  const suspect = outcomes.filter(isDeadToken).map((o) => o.token);
  const retried = suspect.length
    ? await sendPush(
        suspect.map((token) => {
          const original = rows.find((r) => r.token === token);
          return {
            token,
            environment: original?.environment === "sandbox" ? "production" : "sandbox",
          };
        }),
        message,
      )
    : [];

  const corrected = retried.filter((o) => o.ok);
  for (const outcome of corrected) {
    const original = rows.find((r) => r.token === outcome.token);
    await admin
      .from("device_tokens")
      .update({
        environment: original?.environment === "sandbox" ? "production" : "sandbox",
      })
      .eq("token", outcome.token);
  }

  const dead = retried.filter((o) => !o.ok).map((o) => o.token);
  if (dead.length > 0) {
    await admin.from("device_tokens").delete().in("token", dead);
  }

  return {
    sent: outcomes.filter((o) => o.ok).length + corrected.length,
    pruned: dead.length,
    corrected: corrected.length,
  };
}

/** Everyone in a guild — the audience for every festival beat. */
export async function guildMemberIds(guildId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("guild_members")
    .select("user_id")
    .eq("guild_id", guildId);
  return (data ?? []).map((r) => r.user_id);
}
