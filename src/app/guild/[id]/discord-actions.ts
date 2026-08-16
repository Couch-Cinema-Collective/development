"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface DiscordSettings {
  serverId: string;
  inviteUrl: string;
  webhookUrl: string;
}

export type DiscordActionResult = { error?: string; ok?: boolean };

/**
 * Store a guild's Discord wiring. Commissioner-only: RLS on `guilds` already
 * enforces that, so a failed update means the caller wasn't one.
 *
 * The webhook is a credential and is written but never read back to the
 * browser — `getDiscordSettings` reports only whether one exists.
 */
export async function saveDiscordSettings(
  guildId: string,
  settings: DiscordSettings,
): Promise<DiscordActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const serverId = settings.serverId.trim();
  if (serverId && !/^\d{5,}$/.test(serverId)) {
    return {
      error:
        "A Discord server ID is all digits — check you copied the ID, not the name.",
    };
  }

  const webhookUrl = settings.webhookUrl.trim();
  if (webhookUrl && !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return {
      error:
        "That doesn't look like a webhook URL — they start https://discord.com/api/webhooks/",
    };
  }

  const inviteUrl = settings.inviteUrl.trim();
  if (inviteUrl && !/^https:\/\/(discord\.gg|discord\.com\/invite)\//.test(inviteUrl)) {
    return {
      error: "Invite links look like https://discord.gg/… — paste the one from the Widget page.",
    };
  }

  const { error } = await supabase
    .from("guilds")
    .update({
      discord_server_id: serverId || null,
      discord_invite_url: inviteUrl || null,
      discord_webhook_url: webhookUrl || null,
    })
    .eq("id", guildId);

  if (error) {
    return {
      error: "Couldn't save that — only the commissioner can change guild settings.",
    };
  }

  revalidatePath(`/guild/${guildId}`);
  revalidatePath("/season");
  return { ok: true };
}
