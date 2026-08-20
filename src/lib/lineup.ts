import type { LineupFilm, ScreeningPhase } from "./types";

/**
 * The festival clock.
 *
 * Every film in the lineup runs the same cycle in turn — a viewing period,
 * then a review period, then the critics' voting window. Nothing is stored as
 * "current": the phase is derived from the timestamps, so no scheduled job has
 * to tick anything over and every client agrees without being told.
 *
 * Mirrors screening_phase() in schema-06-festivals.sql. The two must stay in
 * step: Postgres decides what you are allowed to do, this decides what you see.
 */
export function phaseOf(film: LineupFilm, now: number = Date.now()): ScreeningPhase {
  if (now < Date.parse(film.viewingStartsAt)) return "UPCOMING";
  if (now < Date.parse(film.reviewStartsAt)) return "VIEWING";
  if (now < Date.parse(film.votingStartsAt)) return "REVIEWING";
  if (now < Date.parse(film.closesAt)) return "CRITICS_VOTING";
  return "CLOSED";
}

/** When the phase a film is currently in runs out. Null once it has closed. */
export function phaseDeadline(
  film: LineupFilm,
  now: number = Date.now(),
): string | null {
  switch (phaseOf(film, now)) {
    case "UPCOMING":
      return film.viewingStartsAt;
    case "VIEWING":
      return film.reviewStartsAt;
    case "REVIEWING":
      return film.votingStartsAt;
    case "CRITICS_VOTING":
      return film.closesAt;
    case "CLOSED":
      return null;
  }
}

export const PHASE_LABELS: Record<ScreeningPhase, string> = {
  UPCOMING: "Coming next",
  VIEWING: "Now screening",
  // Retained for completeness: with reviews written during the viewing
  // window, open_festival() gives this phase zero length and it never shows.
  REVIEWING: "Reviews open",
  CRITICS_VOTING: "Critics voting",
  CLOSED: "Closed",
};

/** The film the festival is actually on right now, if any. */
export function currentFilm(
  lineup: LineupFilm[],
  now: number = Date.now(),
): LineupFilm | null {
  return (
    lineup.find((f) => {
      const phase = phaseOf(f, now);
      return phase !== "UPCOMING" && phase !== "CLOSED";
    }) ?? null
  );
}

/**
 * True when the lineup exists but nothing has opened yet.
 *
 * Distinguishing this from "everything has closed" matters: both leave
 * currentFilm() null, and conflating them told presidents their festival was
 * over before it had started.
 */
export function notYetOpen(
  lineup: LineupFilm[],
  now: number = Date.now(),
): boolean {
  return (
    lineup.length > 0 && lineup.every((f) => phaseOf(f, now) === "UPCOMING")
  );
}

/** True when every film has run its course and the awards are next. */
export function allClosed(
  lineup: LineupFilm[],
  now: number = Date.now(),
): boolean {
  return lineup.length > 0 && lineup.every((f) => phaseOf(f, now) === "CLOSED");
}

/** The next one up — what the "coming next" panel shows. */
export function nextFilm(
  lineup: LineupFilm[],
  now: number = Date.now(),
): LineupFilm | null {
  return lineup.find((f) => phaseOf(f, now) === "UPCOMING") ?? null;
}

/**
 * The fixed cycle, in days.
 *
 * Every film after the first opens Thursday 00:00 Pacific, screens until
 * midnight the Sunday ten days later, then gets Monday to Wednesday for
 * critics to vote on its reviews — an exact fortnight, week-aligned. The
 * first film is ragged: it starts whenever the president opens the festival
 * and runs to the second Sunday, so it can be anything from 11 to 17 days.
 *
 * Mirrors open_festival() in schema-10-calendar-schedule.sql.
 */
export const CYCLE_DAYS = 14;

/** How long a whole festival runs, given the lineup size. */
export function festivalDays(filmCount: number): number {
  return CYCLE_DAYS * Math.max(0, filmCount);
}

/** "About four months" — the number a president actually wants at setup. */
export function describeLength(filmCount: number): string {
  const days = festivalDays(filmCount);
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `about ${Math.round(days / 30)} months`;
}

/** Raw lineup_films row, as stored. */
export interface LineupRow {
  tmdb_id: number;
  film: unknown;
  position: number | null;
  curator_id: string | null;
  viewing_starts_at: string | null;
  review_starts_at: string | null;
  voting_starts_at: string | null;
  closes_at: string | null;
}

/**
 * Rows that predate the clock (or a lineup mid-setup) have no timestamps.
 * They are dropped rather than rendered with a broken schedule.
 */
export function toLineup(rows: LineupRow[]): LineupFilm[] {
  return rows
    .flatMap((r) => {
      if (
        !r.viewing_starts_at ||
        !r.review_starts_at ||
        !r.voting_starts_at ||
        !r.closes_at
      ) {
        return [];
      }
      return [
        {
          film: r.film as LineupFilm["film"],
          position: r.position ?? 0,
          curatorId: r.curator_id,
          viewingStartsAt: r.viewing_starts_at,
          reviewStartsAt: r.review_starts_at,
          votingStartsAt: r.voting_starts_at,
          closesAt: r.closes_at,
        },
      ];
    })
    .sort((a, b) => a.position - b.position);
}
