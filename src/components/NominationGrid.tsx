"use client";

import { useEffect, useState } from "react";

import { FilmPoster } from "./FilmPoster";
import { createClient } from "@/lib/supabase/client";
import type { Film } from "@/lib/types";

export interface GridEntry {
  tmdbId: number;
  film: Film;
  pitch: string;
  locked: boolean;
}

/**
 * The live nomination board: every claimed film in the festival, updating as
 * others nominate, anonymous by design (the RPC never returns who). Real
 * time here is a 10-second poll — Postgres changes on the nominations table
 * carry user_ids, so subscribing to them would leak exactly what the
 * anonymity protects.
 */
export function NominationGrid({
  festivalId,
  initial,
}: {
  festivalId: string;
  initial: GridEntry[];
}) {
  const [entries, setEntries] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function refresh() {
      const { data } = await supabase.rpc("nomination_grid", {
        fid: festivalId,
      });
      if (cancelled || !data) return;
      setEntries(
        (
          data as {
            tmdb_id: number;
            film: Film;
            pitch: string;
            locked: boolean;
          }[]
        ).map((r) => ({
          tmdbId: r.tmdb_id,
          film: r.film,
          pitch: r.pitch,
          locked: r.locked,
        })),
      );
    }

    const timer = setInterval(refresh, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [festivalId]);

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-2">
        <h2 className="label-eyebrow">The board · {entries.length} claimed</h2>
        <span className="label-eyebrow">Anonymous until the ceremony</span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-ink-faint">
          No films claimed yet — the board fills in live as the guild
          nominates.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {entries.map((e) => (
            <li key={e.tmdbId}>
              <FilmPoster film={e.film} />
              <p className="mt-2 truncate text-sm font-medium tracking-tight">
                {e.film.title}
              </p>
              <p className="text-xs text-ink-faint">
                {e.film.year}
                {e.locked ? " · locked in" : " · claimed"}
              </p>
              {e.pitch && (
                <p className="mt-1 line-clamp-3 text-xs italic leading-snug text-ink-soft">
                  &ldquo;{e.pitch}&rdquo;
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
