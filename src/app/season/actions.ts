"use server";

import { createClient } from "@/lib/supabase/server";

export type RoomActionResult = { error?: string };

/** Mark/unmark a slate film watched — what unlocks the ballot (§1.5). */
export async function setWatched(input: {
  seasonId: string;
  tmdbId: number;
  watched: boolean;
}): Promise<RoomActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  // Watching only counts toward eligibility before voting opens.
  const { data: season } = await supabase
    .from("seasons")
    .select("state")
    .eq("id", input.seasonId)
    .maybeSingle();
  if (!season || !["SLATE_LOCKED", "WATCHING"].includes(season.state)) {
    return { error: "The watch checklist is closed once voting opens." };
  }

  if (input.watched) {
    const { error } = await supabase.from("watch_records").upsert(
      {
        season_id: input.seasonId,
        user_id: user.id,
        tmdb_id: input.tmdbId,
      },
      { onConflict: "season_id,user_id,tmdb_id" },
    );
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("watch_records")
      .delete()
      .eq("season_id", input.seasonId)
      .eq("user_id", user.id)
      .eq("tmdb_id", input.tmdbId);
    if (error) return { error: error.message };
  }
  return {};
}

/** Post or update the member's write-up of a slate film. */
export async function saveReview(input: {
  seasonId: string;
  tmdbId: number;
  rating: number;
  body: string;
}): Promise<RoomActionResult & { id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const rating = Math.round(input.rating * 2) / 2;
  if (rating < 0.5 || rating > 5) return { error: "Rating runs ½–5 stars." };
  const body = input.body.trim();
  if (!body) return { error: "Write something first." };

  const { data, error } = await supabase
    .from("reviews")
    .upsert(
      {
        season_id: input.seasonId,
        user_id: user.id,
        tmdb_id: input.tmdbId,
        rating,
        body,
      },
      { onConflict: "season_id,user_id,tmdb_id" },
    )
    .select("id")
    .single();
  if (error) return { error: error.message };

  return { id: data.id };
}
