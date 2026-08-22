"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { REVIEW_MAX_CHARS, UPVOTES_PER_FILM } from "@/lib/types";

export interface ActionResult {
  error?: string;
  ok?: boolean;
}

/**
 * Flag a review for the president, who sees the queue on the guild page and
 * can remove the review or dismiss the flag. Works on anonymous reviews —
 * a flag needs only the review id, never the author. RLS enforces guild
 * membership and the one-flag-per-member rule.
 */
export async function reportReview(reviewId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { error } = await supabase.from("review_reports").insert({
    review_id: reviewId,
    reporter_id: user.id,
    reason: "Flagged from the review thread",
  });

  // Already flagged is the outcome the reporter wanted — treat as success.
  if (error && error.code !== "23505") {
    return { error: "Couldn't send that report." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Mark a film watched, or take the mark back. */
export async function setWatched(
  festivalId: string,
  tmdbId: number,
  watched: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  if (watched) {
    const { error } = await supabase
      .from("watch_records")
      .insert({ festival_id: festivalId, user_id: user.id, tmdb_id: tmdbId });
    // Unique violation just means it was already there — treat as success.
    if (error && error.code !== "23505") {
      return { error: "Couldn't save that. Try again." };
    }
  } else {
    const { error } = await supabase
      .from("watch_records")
      .delete()
      .eq("festival_id", festivalId)
      .eq("user_id", user.id)
      .eq("tmdb_id", tmdbId);
    if (error) return { error: "Couldn't save that. Try again." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * File or amend a review.
 *
 * The 200-character limit and the "only during the review period" rule are
 * both enforced in Postgres; this checks the length too so the member gets a
 * sentence back rather than a constraint violation.
 */
export async function saveReview(
  festivalId: string,
  tmdbId: number,
  body: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const text = body.trim();
  if (!text) return { error: "Write something first." };
  if (text.length > REVIEW_MAX_CHARS) {
    return { error: `Reviews are capped at ${REVIEW_MAX_CHARS} characters.` };
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("festival_id", festivalId)
    .eq("tmdb_id", tmdbId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("reviews").update({ body: text }).eq("id", existing.id)
    : await supabase.from("reviews").insert({
        festival_id: festivalId,
        user_id: user.id,
        tmdb_id: tmdbId,
        body: text,
      });

  if (error) {
    // The review window is the usual reason a write bounces.
    return {
      error:
        "Couldn't file that — the review window for this film may have closed.",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export interface UpvoteResult extends ActionResult {
  spent?: number;
  remaining?: number;
}

/**
 * Spend or reclaim one of the three upvotes on a film.
 *
 * The cap, the window, and the ban on boosting your own writing are all
 * enforced by trigger and policy — this translates the failure into English.
 */
export async function toggleUpvote(
  festivalId: string,
  tmdbId: number,
  reviewId: string,
  upvote: boolean,
): Promise<UpvoteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  if (upvote) {
    const { error } = await supabase
      .from("review_votes")
      .insert({ review_id: reviewId, user_id: user.id });
    if (error && error.code !== "23505") {
      return {
        error: error.message.includes("three")
          ? `You've already spent all ${UPVOTES_PER_FILM} upvotes on this film.`
          : "Couldn't record that upvote.",
      };
    }
  } else {
    const { error } = await supabase
      .from("review_votes")
      .delete()
      .eq("review_id", reviewId)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn't take that upvote back." };
  }

  const { data: budget } = await supabase
    .rpc("my_upvote_budget", { fid: festivalId, tid: tmdbId })
    .maybeSingle();

  revalidatePath("/dashboard");
  return {
    ok: true,
    spent: (budget as { spent: number } | null)?.spent ?? 0,
    remaining: (budget as { remaining: number } | null)?.remaining ?? 0,
  };
}
