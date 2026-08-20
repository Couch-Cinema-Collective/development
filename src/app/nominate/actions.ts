"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Film } from "@/lib/types";

export interface NominateResult {
  error?: string;
  submitted?: number;
  picked?: number;
  expected?: number;
  locked?: boolean;
}

async function counts(festivalId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("nomination_count", { fid: festivalId })
    .maybeSingle();
  const row = data as
    | { submitted: number; picked: number; expected: number }
    | null;
  return {
    submitted: Number(row?.submitted ?? 0),
    picked: Number(row?.picked ?? 0),
    expected: Number(row?.expected ?? 0),
  };
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

/**
 * Commit the pick to the programme.
 *
 * One-way by design: a lock you can undo is just a pick with an extra step,
 * and the whole point of the button is to be the moment a curator is done.
 */
export async function lockNomination(
  festivalId: string,
): Promise<NominateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { error } = await supabase.rpc("lock_nomination", { fid: festivalId });
  if (error) {
    return {
      error: error.message.includes("Pick a film")
        ? "Pick a film before locking it in."
        : "Couldn't lock that in — nominations may have closed.",
    };
  }

  revalidatePath("/nominate");
  revalidatePath("/guild", "layout");
  return { ...(await counts(festivalId)), locked: true };
}
