"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { guildMemberIds, notifyMembers } from "@/lib/notify";

export type FestivalActionResult = { error?: string; ok?: boolean };

async function requirePresident(festivalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, festival: null, error: "Sign in first." };

  const { data: festival } = await supabase
    .from("festivals")
    .select("id, guild_id, state, film_count, viewing_days, review_days, voting_hours")
    .eq("id", festivalId)
    .maybeSingle();
  if (!festival) return { supabase, festival: null, error: "Festival not found." };

  const { data: membership } = await supabase
    .from("guild_members")
    .select("role")
    .eq("guild_id", festival.guild_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership?.role !== "president") {
    return { supabase, festival: null, error: "Guild president only." };
  }

  return { supabase, festival, error: null };
}

/**
 * Festival beats, pushed to every member's phone. Deliberately non-blocking: a
 * push failure must never fail the transition that triggered it.
 */
async function announce(
  guildId: string,
  message: { title: string; body: string; path: string },
) {
  try {
    await notifyMembers(await guildMemberIds(guildId), message);
  } catch {
    // Notifications are a courtesy; the festival moves on regardless.
  }
}

/** DRAFT/RECRUITING → NOMINATING. Curators can start putting films up. */
export async function openNominations(
  festivalId: string,
  deadlineDays = 7,
): Promise<FestivalActionResult> {
  const { supabase, festival, error } = await requirePresident(festivalId);
  if (error || !festival) return { error: error ?? "Festival not found." };
  if (!["DRAFT", "RECRUITING"].includes(festival.state)) {
    return { error: "Nominations have already opened." };
  }

  const deadline = new Date(
    Date.now() + deadlineDays * 86_400_000,
  ).toISOString();

  const { error: stateError } = await supabase
    .from("festivals")
    .update({ state: "NOMINATING", nomination_deadline: deadline })
    .eq("id", festivalId);
  if (stateError) return { error: stateError.message };

  await announce(festival.guild_id, {
    title: "Nominations are open",
    body: "Curators: put your film up before the window closes.",
    path: "/nominate",
  });

  revalidatePath(`/guild/${festival.guild_id}`);
  return { ok: true };
}

/**
 * NOMINATING → LINEUP_SET, via the database's set_lineup().
 *
 * Postgres builds the lineup from the curators' picks, shuffles the screening
 * order, and stamps every film's viewing/review/voting windows from the
 * festival's cadence. Doing it there rather than here means the schedule and
 * the rules that read it can never disagree.
 */
export async function setLineup(
  festivalId: string,
  startsAt?: string,
): Promise<FestivalActionResult> {
  const { supabase, festival, error } = await requirePresident(festivalId);
  if (error || !festival) return { error: error ?? "Festival not found." };

  // Default to tomorrow, so nobody wakes up already behind on the first film.
  const start = startsAt ?? new Date(Date.now() + 86_400_000).toISOString();

  const { error: rpcError } = await supabase.rpc("set_lineup", {
    fid: festivalId,
    starts_at: start,
  });
  if (rpcError) {
    return {
      error: rpcError.message.includes("locked")
        ? "No curator has locked a film in yet — there is nothing to schedule."
        : rpcError.message,
    };
  }

  await announce(festival.guild_id, {
    title: "The lineup is set",
    body: "The festival opens shortly. First film, first window.",
    path: "/dashboard",
  });

  revalidatePath(`/guild/${festival.guild_id}`);
  return { ok: true };
}

/**
 * LINEUP_SET → SCREENING, via open_festival().
 *
 * This re-stamps every film's windows from the moment it is called, so the
 * first film opens now rather than whenever the lineup happened to be drawn.
 * A president who sits on a drawn lineup for three days waiting on stragglers
 * should still get a festival that starts when they say it starts.
 */
export async function startScreening(
  festivalId: string,
): Promise<FestivalActionResult> {
  const { supabase, festival, error } = await requirePresident(festivalId);
  if (error || !festival) return { error: error ?? "Festival not found." };

  const { error: rpcError } = await supabase.rpc("open_festival", {
    fid: festivalId,
  });
  if (rpcError) return { error: rpcError.message };

  await announce(festival.guild_id, {
    title: "The festival is open",
    body: "First film, first window. The clock is running.",
    path: "/dashboard",
  });

  revalidatePath(`/guild/${festival.guild_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** SCREENING → AWARDS_VOTING. The ballot opens once every film has closed. */
export async function openAwardsVoting(
  festivalId: string,
): Promise<FestivalActionResult> {
  const { supabase, festival, error } = await requirePresident(festivalId);
  if (error || !festival) return { error: error ?? "Festival not found." };

  // Voting on films nobody has finished watching would decide nothing.
  const { data: open } = await supabase
    .from("lineup_films")
    .select("tmdb_id")
    .eq("festival_id", festivalId)
    .gt("closes_at", new Date().toISOString());
  if ((open ?? []).length > 0) {
    return {
      error: `${open!.length} film${open!.length === 1 ? " is" : "s are"} still screening — the ballot opens when the last one closes.`,
    };
  }

  const { error: stateError } = await supabase
    .from("festivals")
    .update({ state: "AWARDS_VOTING" })
    .eq("id", festivalId);
  if (stateError) return { error: stateError.message };

  await announce(festival.guild_id, {
    title: "The ballot is open",
    body: "One pick per award. Best of the Fest decides the festival.",
    path: "/vote",
  });

  revalidatePath(`/guild/${festival.guild_id}`);
  return { ok: true };
}

/**
 * AWARDS_VOTING → CEREMONY, via the database's publish_festival() — results
 * are computed and written inside Postgres and cannot be edited afterward.
 */
export async function publishFestival(
  festivalId: string,
): Promise<FestivalActionResult> {
  const { supabase, festival, error } = await requirePresident(festivalId);
  if (error || !festival) return { error: error ?? "Festival not found." };

  const { error: rpcError } = await supabase.rpc("publish_festival", {
    fid: festivalId,
  });
  if (rpcError) return { error: rpcError.message };

  await announce(festival.guild_id, {
    title: "The envelopes are open",
    body: "Best of the Fest and Voice of the People are decided.",
    path: "/ceremony",
  });

  revalidatePath(`/guild/${festival.guild_id}`);
  return { ok: true };
}

/** CEREMONY → ARCHIVED. Closes the festival out. */
export async function archiveFestival(
  festivalId: string,
): Promise<FestivalActionResult> {
  const { supabase, festival, error } = await requirePresident(festivalId);
  if (error || !festival) return { error: error ?? "Festival not found." };

  const { error: stateError } = await supabase
    .from("festivals")
    .update({ state: "ARCHIVED" })
    .eq("id", festivalId);
  if (stateError) return { error: stateError.message };

  revalidatePath(`/guild/${festival.guild_id}`);
  return { ok: true };
}

// ── Curator seats ───────────────────────────────────────────────────────────

/**
 * Set how many curator seats the guild has.
 *
 * This is the president's only lever over the curator roster now that seats
 * are first-come-first-served — they control how many exist, not who fills
 * them. Postgres refuses to cut below the number already seated.
 */
export async function setCuratorSeats(
  guildId: string,
  seats: number,
): Promise<FestivalActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_curator_seats", {
    gid: guildId,
    seats,
  });
  if (error) return { error: error.message };

  revalidatePath(`/guild/${guildId}`);
  return { ok: true };
}
