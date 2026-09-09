"use client";

import { useState, useTransition } from "react";

import { FilmPoster } from "./FilmPoster";
import { saveRanking } from "@/app/rank/actions";
import { tapHaptic } from "@/lib/native";
import type { Film } from "@/lib/types";

export interface RankedFilm {
  tmdbId: number;
  film: Film;
  pitch: string;
}

/**
 * The rank-choice ballot: reorder with the arrows, top is your favourite.
 * Saved as a whole — instant-runoff reads it when the president draws.
 */
export function RankBallot({
  festivalId,
  films,
  alreadySaved,
}: {
  festivalId: string;
  films: RankedFilm[];
  alreadySaved: boolean;
}) {
  const [order, setOrder] = useState(films);
  const [saved, setSaved] = useState(alreadySaved);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    void tapHaptic();
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveRanking(
        festivalId,
        order.map((f) => f.tmdbId),
      );
      if (result.error) setError(result.error);
      else {
        setSaved(true);
        setDirty(false);
      }
    });
  }

  return (
    <div>
      <ol className="grid gap-px border border-rule bg-rule">
        {order.map((entry, i) => (
          <li
            key={entry.tmdbId}
            className="flex items-center gap-4 bg-paper-raised px-4 py-3"
          >
            <span className="w-8 shrink-0 text-2xl font-medium tabular-nums text-signal">
              {i + 1}
            </span>
            <div className="w-12 shrink-0">
              <FilmPoster film={entry.film} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium tracking-tight">
                {entry.film.title}
              </p>
              <p className="truncate text-xs text-ink-faint">
                {entry.film.year}
                {entry.film.director ? ` · ${entry.film.director}` : ""}
              </p>
              {entry.pitch && (
                <p className="mt-1 line-clamp-2 text-xs italic leading-snug text-ink-soft">
                  &ldquo;{entry.pitch}&rdquo;
                </p>
              )}
            </div>
            <span className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${entry.film.title} up`}
                className="border border-rule px-2.5 py-1 text-xs transition-colors hover:border-ink disabled:opacity-25"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === order.length - 1}
                aria-label={`Move ${entry.film.title} down`}
                className="border border-rule px-2.5 py-1 text-xs transition-colors hover:border-ink disabled:opacity-25"
              >
                ▼
              </button>
            </span>
          </li>
        ))}
      </ol>

      {error && <p className="mt-4 text-sm text-signal">{error}</p>}

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={submit}
          disabled={pending || (saved && !dirty)}
          className="bg-signal px-7 py-3.5 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink disabled:opacity-40"
        >
          {pending
            ? "Saving…"
            : saved && !dirty
              ? "Ranking saved ✓"
              : saved
                ? "Update ranking"
                : "Save ranking"}
        </button>
        <span className="text-xs leading-relaxed text-ink-faint">
          Top of the list is your favourite. You can change it until the
          president draws the lineup.
        </span>
      </div>
    </div>
  );
}
