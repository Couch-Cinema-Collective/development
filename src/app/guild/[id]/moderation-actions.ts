"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ModerationResult = { error?: string };

/**
 * President takedown of a review. Upvotes and flags cascade with the row.
 * RLS is the gatekeeper — a non-president's delete matches nothing, which
 * PostgREST reports as zero rows rather than an error, so the outcome is
 * checked explicitly.
 */
export async function removeReview(
  guildId: string,
  reviewId: string,
): Promise<ModerationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { data, error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "President only." };

  revalidatePath(`/guild/${guildId}`);
  revalidatePath("/dashboard");
  return {};
}

/** Clear a flag without touching the review it points at. */
export async function dismissReport(
  guildId: string,
  reportId: string,
): Promise<ModerationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { data, error } = await supabase
    .from("review_reports")
    .delete()
    .eq("id", reportId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "President only." };

  revalidatePath(`/guild/${guildId}`);
  return {};
}

/**
 * President removes a member from the guild. Their reviews and votes stay
 * (festival history is a fact); what goes is access. The president can't be
 * removed this way — including by themselves. Removing a curator mid-
 * festival also orphans their nomination, so the confirm step matters.
 */
export async function removeMember(
  guildId: string,
  userId: string,
): Promise<ModerationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { data: target } = await supabase
    .from("guild_members")
    .select("role")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return { error: "Not a member of this guild." };
  if (target.role === "president") {
    return { error: "The president can't be removed." };
  }

  const { data, error } = await supabase
    .from("guild_members")
    .delete()
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "President only." };

  revalidatePath(`/guild/${guildId}`);
  return {};
}

/**
 * Personal block: hides the member's revealed reviews from you everywhere,
 * and nothing else. The blocked member is never notified. (Anonymous
 * reviews stay visible until their reveal — there is no author to match.)
 */
export async function setMemberBlocked(
  guildId: string,
  blockedId: string,
  blocked: boolean,
): Promise<ModerationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  if (blockedId === user.id) return { error: "That's you." };

  if (blocked) {
    const { error } = await supabase
      .from("member_blocks")
      .insert({ blocker_id: user.id, blocked_id: blockedId });
    // Already blocked is the state they asked for.
    if (error && error.code !== "23505") {
      return { error: "Couldn't block that member." };
    }
  } else {
    const { error } = await supabase
      .from("member_blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedId);
    if (error) return { error: "Couldn't unblock that member." };
  }

  revalidatePath(`/guild/${guildId}`);
  revalidatePath("/dashboard");
  return {};
}
