"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type GuildFormState = { error?: string } | null;

/** Commissioner path: name a guild, become its commissioner (DB trigger). */
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
  redirect(`/guild/${id}`);
}

/** Player path: invite code → membership, via the join_guild RPC. */
export async function joinGuild(
  _prev: GuildFormState,
  formData: FormData,
): Promise<GuildFormState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter an invite code." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/join/${encodeURIComponent(code)}`);

  const { data: guildId, error } = await supabase.rpc("join_guild", { code });
  if (error) {
    // Surface the DB's own messages ("Invalid invite code", capacity) as-is —
    // they're written for humans.
    return { error: error.message };
  }

  revalidatePath("/welcome");
  redirect(`/guild/${guildId}`);
}
