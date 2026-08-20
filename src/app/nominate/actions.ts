"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Film } from "@/lib/types";

export interface NominateResult {
  error?: string;
  submitted?: number;
  expected?: number;
}

async function counts(festivalId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("nomination_count", { fid: festivalId })
    .maybeSingle();
  const row = data as { submitted: number; expected: number } | null;
  return { submitted: Number(row?.submitted ?? 0), expected: Number(row?.expected ?? 0) };
}

/**
 * Put a film up, or swap it for a different one.
 *
 * One film per curator, so this is an upsert on (festival, curator) rather
 * than an insert — changing your mind replaces the pick instead of adding to
 * it. Postgres holds the real rules: curators only, and only while nominations
 * are open.
 */
export async function nominate(
  festivalId: string,
  film: Film,
): Promise<NominateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { error } = await supabase.from("nominations").upsert(
    {
      festival_id: festivalId,
      user_id: user.id,
      tmdb_id: film.id,
      film,
    },
    { onConflict: "festival_id,user_id" },
  );

  if (error) {
    return {
      error:
        "Couldn't put that film up — nominations may have closed, or you may not hold a curator seat.",
    };
  }

  revalidatePath("/nominate");
  return counts(festivalId);
}

/** Withdraw without replacing. Leaves the curator with no film in the lineup. */
export async function withdrawNomination(
  festivalId: string,
): Promise<NominateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { error } = await supabase
    .from("nominations")
    .delete()
    .eq("festival_id", festivalId)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't withdraw that pick." };

  revalidatePath("/nominate");
  return counts(festivalId);
}
