"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ReviewVoteResult = { error?: string; upvoted?: boolean };

/**
 * Toggle an upvote on someone else's review.
 *
 * RLS does the real enforcement — guild membership, and the rule that you
 * cannot upvote your own write-up. Counts are always derived from the rows,
 * never stored, so they can't drift out of sync.
 */
export async function toggleReviewVote(
  reviewId: string,
  upvoted: boolean,
): Promise<ReviewVoteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  if (upvoted) {
    const { error } = await supabase
      .from("review_votes")
      .insert({ review_id: reviewId, user_id: user.id });

    // Unique violation just means it was already there — treat as success.
    if (error && error.code !== "23505") {
      return { error: "Couldn't record that — you can't upvote your own review." };
    }
  } else {
    const { error } = await supabase
      .from("review_votes")
      .delete()
      .eq("review_id", reviewId)
      .eq("user_id", user.id);

    if (error) return { error: "Couldn't remove that upvote." };
  }

  revalidatePath("/season");
  return { upvoted };
}
