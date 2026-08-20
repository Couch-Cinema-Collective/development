"use server";

import { createClient } from "@/lib/supabase/server";

export type VoteResult = { error?: string };

/**
 * One vote per award category, revisable until the ceremony is published.
 *
 * The old "finish the slate or you don't vote" gate is gone: eligibility is
 * now enforced film by film, as it happens — miss a review window and you miss
 * that film's round. By the time the ballot opens, every window has already
 * closed, so there is nothing left to gate on.
 */
export async function castVote(input: {
  festivalId: string;
  awardId: string;
  tmdbId: number;
  /** Acting categories are won by a person; every other award leaves this off. */
  person?: {
    id: number;
    name: string;
    character: string;
    profilePath: string | null;
  };
}): Promise<VoteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { data: festival } = await supabase
    .from("festivals")
    .select("state")
    .eq("id", input.festivalId)
    .maybeSingle();
  if (!festival) return { error: "Festival not found." };
  if (festival.state !== "AWARDS_VOTING") {
    return { error: "The ballot isn't open for this festival." };
  }

  const { error } = await supabase.from("votes").upsert(
    {
      festival_id: input.festivalId,
      user_id: user.id,
      award_id: input.awardId,
      tmdb_id: input.tmdbId,
      person_id: input.person?.id ?? null,
      person: input.person ?? null,
    },
    { onConflict: "festival_id,user_id,award_id" },
  );
  if (error) return { error: error.message };

  return {};
}
