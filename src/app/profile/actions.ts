"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DeleteResult = { error?: string };

/**
 * Permanently delete the signed-in member's account.
 *
 * Required by App Store guideline 5.1.1(v): any app offering account creation
 * must offer in-app deletion.
 *
 * Every domain table references auth.users with `on delete cascade`, so
 * removing the auth record takes nominations, reviews, votes, watch records,
 * upvotes and memberships with it. The only thing needing care first is a
 * guild left without a commissioner.
 */
export async function deleteAccount(): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Deletion is unavailable." };
  }

  // Guilds this member runs. Leaving one headless would strand the members.
  const { data: commissionerOf } = await admin
    .from("guild_members")
    .select("guild_id")
    .eq("user_id", user.id)
    .eq("role", "commissioner");

  for (const { guild_id } of commissionerOf ?? []) {
    const { data: others } = await admin
      .from("guild_members")
      .select("user_id, joined_at")
      .eq("guild_id", guild_id)
      .neq("user_id", user.id)
      .order("joined_at", { ascending: true });

    if (others && others.length > 0) {
      // Hand the guild to its longest-standing remaining member.
      await admin
        .from("guild_members")
        .update({ role: "commissioner" })
        .eq("guild_id", guild_id)
        .eq("user_id", others[0].user_id);
    } else {
      // Nobody left to run it — the guild goes with them.
      await admin.from("guilds").delete().eq("id", guild_id);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Couldn't delete the account. Try again shortly." };

  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
