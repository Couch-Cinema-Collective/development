import "server-only";

import { getUserMemberships } from "@/lib/guilds";
import { phaseDeadline, phaseOf, toLineup, type LineupRow } from "@/lib/lineup";
import { createClient } from "@/lib/supabase/server";
import type { LineupFilm, ScreeningPhase } from "@/lib/types";

/** Mirrors LIVE_STATES in src/app/dashboard/page.tsx — states with a running clock. */
const LIVE_STATES = ["LINEUP_SET", "SCREENING", "AWARDS_VOTING"];

export interface LiveScreening {
  guildId: string;
  guildName: string;
  festivalNumber: number;
  film: LineupFilm["film"];
  phase: ScreeningPhase;
  deadline: string;
}

/**
 * Every film still ahead of the credits — currently screening, reviewing, or
 * up for critics' vote, plus whatever hasn't opened yet — in every guild the
 * member belongs to. Closed films are dropped; guilds with nothing left open
 * are excluded entirely. Drives the "what's playing" carousel on the welcome
 * page, across guilds rather than the one at a time the dashboard shows.
 */
export async function getLiveScreenings(): Promise<LiveScreening[]> {
  const memberships = await getUserMemberships();
  if (!memberships.length) return [];

  const supabase = await createClient();
  const guildIds = memberships.map((m) => m.guildId);

  const { data: festivalRows } = await supabase
    .from("festivals")
    .select("id, number, guild_id")
    .in("guild_id", guildIds)
    .in("state", LIVE_STATES)
    .order("number", { ascending: false });
  if (!festivalRows?.length) return [];

  // One live festival per guild — the newest, if a guild somehow has more.
  const festivalByGuild = new Map<string, { id: string; number: number }>();
  for (const row of festivalRows) {
    if (!festivalByGuild.has(row.guild_id)) {
      festivalByGuild.set(row.guild_id, { id: row.id, number: row.number });
    }
  }
  const festivalIds = [...festivalByGuild.values()].map((f) => f.id);

  const { data: lineupRows } = await supabase
    .from("lineup_films")
    .select(
      "festival_id, tmdb_id, film, position, curator_id, viewing_starts_at, review_starts_at, voting_starts_at, closes_at",
    )
    .in("festival_id", festivalIds);

  const rowsByFestival = new Map<string, LineupRow[]>();
  for (const row of lineupRows ?? []) {
    const bucket = rowsByFestival.get(row.festival_id) ?? [];
    bucket.push(row);
    rowsByFestival.set(row.festival_id, bucket);
  }

  const nameByGuild = new Map(memberships.map((m) => [m.guildId, m.guildName]));

  const screenings: LiveScreening[] = [];
  for (const [guildId, festival] of festivalByGuild.entries()) {
    const lineup = toLineup(rowsByFestival.get(festival.id) ?? []);
    // Position order, which is also screening order — the film that's on
    // (if any) leads, followed by whatever's coming next.
    for (const film of lineup) {
      const phase = phaseOf(film);
      if (phase === "CLOSED") continue;

      const deadline = phaseDeadline(film);
      if (!deadline) continue;

      screenings.push({
        guildId,
        guildName: nameByGuild.get(guildId) ?? "Unnamed",
        festivalNumber: festival.number,
        film: film.film,
        phase,
        deadline,
      });
    }
  }

  return screenings;
}
