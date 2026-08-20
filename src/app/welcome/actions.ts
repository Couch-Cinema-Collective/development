"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type GuildFormState = { error?: string } | null;

/** President path: name a guild, become its president (DB trigger). */
export async function createGuild(
  _prev: GuildFormState,
  formData: FormData,
): Promise<GuildFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give your guild a name." };
  if (name.length > 80) return { error: "Keep the name under 80 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/welcome");

  // Generate the id here rather than asking the insert to RETURNING it:
  // the guilds select-policy requires membership, which the on-insert trigger
  // only creates after the statement — so a returning read is denied by RLS.
  const id = randomUUID();
  const { error } = await supabase
    .from("guilds")
    .insert({ id, name, created_by: user.id });
  if (error) return { error: error.message };

  revalidatePath("/welcome");
  // Festival setup comes before invites (design decision): land the new
  // president in the wizard; the guild page unlocks the invite link after.
  redirect(`/festival/new?guild=${id}`);
}

/**
 * Member path: invite code → membership, via the join_guild RPC.
 *
 * `as_curator` decides which chair they land in — critics are admitted on the
 * spot, curator applications wait for the president.
 */
export async function joinGuild(
  _prev: GuildFormState,
  formData: FormData,
): Promise<GuildFormState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter an invite code." };
  const asCurator = formData.get("role") === "curator";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/join/${encodeURIComponent(code)}`);

  const { data: guildId, error } = await supabase.rpc("join_guild", {
    code,
    as_curator: asCurator,
  });
  if (error) {
    // Surface the DB's own messages ("Invalid invite code", capacity) as-is —
    // they're written for humans.
    return { error: error.message };
  }

  revalidatePath("/welcome");
  redirect(`/guild/${guildId}`);
}
