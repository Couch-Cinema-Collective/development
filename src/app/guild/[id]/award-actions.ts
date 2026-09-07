"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getTopCast } from "@/lib/tmdb";
import type { ActingNominee } from "@/lib/types";

export type AwardActionResult = { error?: string };

/**
 * Fill every empty acting category with one nominee per lineup film — the
 * top-billed performer, the closest thing to "internet consensus" we can
 * fetch. The president edits from there. RLS holds writes to the president.
 */
export async function seedActingNominees(
  festivalId: string,
): Promise<AwardActionResult & { seeded?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const [{ data: awards }, { data: films }] = await Promise.all([
    supabase
      .from("festival_awards")
      .select("award_id, nominees")
      .eq("festival_id", festivalId)
      .eq("tier", "performance"),
    supabase
      .from("lineup_films")
      .select("tmdb_id")
      .eq("festival_id", festivalId)
      .order("position"),
  ]);

  const empty = (awards ?? []).filter(
    (a) => !Array.isArray(a.nominees) || a.nominees.length === 0,
  );
  if (empty.length === 0 || !films?.length) return { seeded: 0 };

  // One cast fetch per film, shared across every acting category.
  const topBilled = new Map<number, ActingNominee>();
  for (const f of films) {
    try {
      const cast = await getTopCast(f.tmdb_id);
      if (cast[0]) {
        topBilled.set(f.tmdb_id, {
          tmdbId: f.tmdb_id,
          name: cast[0].name,
          personId: cast[0].id,
        });
      }
    } catch {
      // A film without cast data just starts blank for the president.
    }
  }

  const nominees = films
    .map((f) => topBilled.get(f.tmdb_id))
    .filter((n): n is ActingNominee => Boolean(n));

  for (const award of empty) {
    const { data, error } = await supabase
      .from("festival_awards")
      .update({ nominees })
      .eq("festival_id", festivalId)
      .eq("award_id", award.award_id)
      .select("award_id");
    if (error) return { error: error.message };
    if (!data?.length) return { error: "President only." };
  }

  revalidatePath(`/guild/${festivalId}`);
  return { seeded: empty.length };
}

/** The president's edit: replace one acting category's nominee slate. */
export async function saveActingNominees(
  guildId: string,
  festivalId: string,
  awardId: string,
  nominees: ActingNominee[],
): Promise<AwardActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const cleaned = nominees
    .map((n) => ({
      tmdbId: n.tmdbId,
      name: n.name.trim().slice(0, 80),
      personId: n.personId,
    }))
    .filter((n) => n.name);

  const { data, error } = await supabase
    .from("festival_awards")
    .update({ nominees: cleaned })
    .eq("festival_id", festivalId)
    .eq("award_id", awardId)
    .select("award_id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "President only." };

  revalidatePath(`/guild/${guildId}`);
  revalidatePath("/vote");
  return {};
}
