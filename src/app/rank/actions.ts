"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type RankResult = { error?: string };

/**
 * Replace the member's whole ranking in one go — rank 1 is the top choice.
 * RLS holds it to guild members while the festival is in RANKING; the
 * instant-runoff tally reads whatever stands when the president draws.
 */
export async function saveRanking(
  festivalId: string,
  orderedTmdbIds: number[],
): Promise<RankResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  if (orderedTmdbIds.length === 0) return { error: "Nothing to rank." };

  const { error: clearError } = await supabase
    .from("rank_ballots")
    .delete()
    .eq("festival_id", festivalId)
    .eq("user_id", user.id);
  if (clearError) return { error: "Couldn't update your ranking." };

  const { error } = await supabase.from("rank_ballots").insert(
    orderedTmdbIds.map((tmdbId, i) => ({
      festival_id: festivalId,
      user_id: user.id,
      tmdb_id: tmdbId,
      rank: i + 1,
    })),
  );
  if (error) {
    return { error: "Couldn't save — the ranking window may have closed." };
  }

  revalidatePath("/rank");
  return {};
}
