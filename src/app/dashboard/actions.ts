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

/**
 * The president's early-close: when everyone has watched, end this film's
 * viewing window now and carry the time saved into every film still ahead,
 * rather than waiting out the clock. advance_screening() re-checks the
 * watch count and the president role itself — this only translates a
 * rejection into something readable.
 */
export async function advanceScreening(
  festivalId: string,
  tmdbId: number,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { error } = await supabase.rpc("advance_screening", {
    fid: festivalId,
    tid: tmdbId,
  });
  if (error) {
    return {
      error: error.message.includes("watched")
        ? "Not everyone has watched this one yet."
        : "Couldn't move this film forward.",
    };
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

export type UpvoteKind = "insightful" | "funniest";

export interface AllocateResult extends ActionResult {
  /** Remaining budget per kind after the change. */
  insightfulRemaining?: number;
  funniestRemaining?: number;
}

/**
 * Spend or reclaim one "Most Insightful" or "Funniest" upvote — three of
 * each per critic per film, stacking on one review allowed. Window, budget,
 * and the own-review ban are enforced by trigger; this translates failures.
 */
export async function allocateUpvote(
  festivalId: string,
  tmdbId: number,
  reviewId: string,
  kind: UpvoteKind,
  add: boolean,
): Promise<AllocateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  if (add) {
    const { error } = await supabase
      .from("review_votes")
      .insert({ review_id: reviewId, user_id: user.id, kind });
    if (error) {
      return {
        error: error.message.includes("all three")
          ? `All three ${kind} upvotes are spent on this film.`
          : "Couldn't record that upvote.",
      };
    }
  } else {
    // Reclaim exactly one allocation of this kind.
    const { data: row } = await supabase
      .from("review_votes")
      .select("id")
      .eq("review_id", reviewId)
      .eq("user_id", user.id)
      .eq("kind", kind)
      .limit(1)
      .maybeSingle();
    if (!row) return { error: "No upvote of that kind to take back." };
    const { error } = await supabase.from("review_votes").delete().eq("id", row.id);
    if (error) return { error: "Couldn't take that upvote back." };
  }

  const { data: budgets } = await supabase.rpc("my_upvote_budgets", {
    fid: festivalId,
    tid: tmdbId,
  });
  const byKind = new Map(
    ((budgets ?? []) as { kind: string; remaining: number }[]).map((b) => [
      b.kind,
      b.remaining,
    ]),
  );

  revalidatePath("/dashboard");
  return {
    ok: true,
    insightfulRemaining: byKind.get("insightful"),
    funniestRemaining: byKind.get("funniest"),
  };
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
