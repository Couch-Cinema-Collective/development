import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Countdown } from "@/components/Countdown";
import { FilmPoster } from "@/components/FilmPoster";
import { getCurrentFestival } from "@/lib/guilds";
import { PHASE_LABELS, phaseDeadline, phaseOf, toLineup, type LineupRow } from "@/lib/lineup";
import { createClient } from "@/lib/supabase/server";

/** Mirrors LIVE_STATES in src/app/dashboard/page.tsx — states with a running clock. */
const LIVE_STATES = ["LINEUP_SET", "SCREENING", "AWARDS_VOTING"];

/**
 * A single film's own page — poster, synopsis, and where it sits in the
 * clock. Read-only: reviewing only ever happens on the dashboard, and only
 * once the film is actually the one screening. This exists so a member can
 * look ahead at what's coming without waiting for it to open.
 */
export default async function FilmPage({
  params,
}: {
  params: Promise<{ id: string; tmdbId: string }>;
}) {
  const { id: guildId, tmdbId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/guild/${guildId}/film/${tmdbId}`)}`);
  }

  const festival = await getCurrentFestival(LIVE_STATES, guildId);
  if (!festival) notFound();

  const { data: rows } = await supabase
    .from("lineup_films")
    .select(
      "tmdb_id, film, position, curator_id, viewing_starts_at, review_starts_at, voting_starts_at, closes_at",
    )
    .eq("festival_id", festival.id);

  // toLineup() derives position from screening order rather than trusting
  // the stored column, so this page's numbering always matches the dashboard.
  const lineup = toLineup((rows ?? []) as LineupRow[]);
  const entry = lineup.find((f) => f.film.id === Number(tmdbId));
  if (!entry) notFound();

  const film = entry.film;
  const phase = phaseOf(entry);
  const deadline = phaseDeadline(entry);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/dashboard?guild=${guildId}`}
        className="label-eyebrow hover:text-signal"
      >
        ← Back to dashboard
      </Link>

      <div className="mt-6 grid gap-8 sm:grid-cols-[220px_1fr]">
        <div className="w-full max-w-[220px]">
          <FilmPoster film={film} />
        </div>

        <div className="min-w-0">
          <p className="label-eyebrow text-signal">
            {PHASE_LABELS[phase]} · Film {entry.position} of {lineup.length}
          </p>
          <h1 className="mt-2 text-balance text-4xl font-medium uppercase leading-none tracking-tight sm:text-5xl">
            {film.title}
          </h1>
          <p className="mt-3 text-sm text-ink-faint">
            {film.year}
            {film.director ? ` · ${film.director}` : ""}
            {film.runtime ? ` · ${film.runtime} min` : ""}
          </p>

          {film.overview && (
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink-soft">
              {film.overview}
            </p>
          )}

          {deadline && (
            <div className="mt-8">
              <p className="label-eyebrow">
                {phase === "UPCOMING" ? "Opens in" : "Time left in this window"}
              </p>
              <div className="mt-2">
                <Countdown
                  deadline={deadline}
                  expiredLabel="Just closed"
                  forceUrgent={phase !== "UPCOMING"}
                />
              </div>
            </div>
          )}

          {phase === "UPCOMING" && (
            <p className="mt-6 text-xs leading-relaxed text-ink-faint">
              Reviewing opens once this film&apos;s own window starts — for
              now, this is just a look ahead.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
