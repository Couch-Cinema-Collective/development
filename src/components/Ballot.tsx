"use client";

import { useState } from "react";
import Link from "next/link";

import { FilmPoster } from "./FilmPoster";
import { castVote } from "@/app/vote/actions";
import type { AwardCategory, Ballot as BallotType, Film } from "@/lib/types";

interface BallotProps {
  seasonId: string;
  awards: AwardCategory[];
  slate: Film[];
  watchedIds: number[];
  /** Saved picks: award id → tmdb id. */
  initialBallot: BallotType;
  /** True when the season runs on the honor system (§1.5). */
  honorGate: boolean;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function Ballot({
  seasonId,
  awards,
  slate,
  watchedIds,
  initialBallot,
  honorGate,
}: BallotProps) {
  const [ballot, setBallot] = useState<BallotType>(initialBallot);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const unwatched = slate.filter((f) => !watchedIds.includes(f.id));
  const gated = honorGate && unwatched.length > 0;

  if (gated) {
    return (
      <section className="max-w-xl border border-ink bg-paper-raised p-8">
        <p className="label-eyebrow text-signal">Ballot locked</p>
        <h2 className="mt-3 text-3xl font-medium uppercase leading-tight tracking-tight">
          {watchedIds.length} of {slate.length} watched
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Voting opens once you&apos;ve finished the slate. If you didn&apos;t
          finish the movies, you just don&apos;t get to vote — that&apos;s the
          deal. It costs you nothing but this round&apos;s ballot.
        </p>

        <ul className="mt-6 space-y-2">
          {unwatched.map((film) => (
            <li key={film.id} className="flex items-baseline gap-3 text-sm">
              <span className="size-1.5 shrink-0 rounded-full bg-signal" />
              <span>{film.title}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/season"
          className="mt-8 inline-block bg-ink px-6 py-3 text-xs uppercase tracking-[0.12em] text-paper transition-colors hover:bg-signal"
        >
          Back to the season
        </Link>
      </section>
    );
  }

  function pick(awardId: string, filmId: number) {
    const previous = ballot[awardId];
    if (previous === filmId) return;
    setBallot((prev) => ({ ...prev, [awardId]: filmId }));
    setSaveState("saving");
    setSaveError(null);
    void castVote({ seasonId, awardId, tmdbId: filmId }).then((result) => {
      if (result.error) {
        // Roll the pick back to what the server last accepted.
        setBallot((prev) => {
          const next = { ...prev };
          if (previous === undefined) delete next[awardId];
          else next[awardId] = previous;
          return next;
        });
        setSaveState("error");
        setSaveError(result.error);
        return;
      }
      setSaveState("saved");
    });
  }

  const cast = Object.keys(ballot).length;

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 border-b border-rule bg-paper/95 px-6 py-4 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <span className="label-eyebrow">Your ballot</span>
          <span className="text-sm">
            <span
              className={`mr-4 text-xs ${
                saveState === "error" ? "text-signal" : "text-ink-faint"
              }`}
              role="status"
            >
              {saveState === "error"
                ? saveError
                : saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "Saved"
                    : ""}
            </span>
            <span className="tabular-nums">
              {cast} / {awards.length}
            </span>
          </span>
        </div>
        <div className="mt-3 flex gap-1">
          {awards.map((award) => (
            <span
              key={award.id}
              className={`h-1 flex-1 ${ballot[award.id] ? "bg-signal" : "bg-rule"}`}
            />
          ))}
        </div>
      </div>

      <ol className="mt-10 space-y-14">
        {awards.map((award, index) => (
          <li key={award.id}>
            <div className="flex items-baseline gap-4">
              <span className="tabular-nums text-xs text-ink-faint">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="text-2xl font-medium uppercase tracking-tight">
                {award.name}
              </h2>
              {award.tier === "custom" && (
                <span className="label-eyebrow text-signal">Custom</span>
              )}
            </div>

            <ul className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-6">
              {slate.map((film) => {
                const chosen = ballot[award.id] === film.id;
                return (
                  <li key={film.id}>
                    <button
                      type="button"
                      onClick={() => pick(award.id, film.id)}
                      className="group block w-full text-left"
                      aria-pressed={chosen}
                    >
                      <span
                        className={`block transition-opacity ${
                          chosen ? "" : "opacity-55 group-hover:opacity-100"
                        }`}
                      >
                        <FilmPoster film={film} />
                      </span>
                      <span
                        className={`mt-2 block truncate text-xs ${
                          chosen ? "font-medium text-signal" : "text-ink-faint"
                        }`}
                      >
                        {film.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      <p className="mt-16 border-t border-rule pt-6 text-sm leading-relaxed text-ink-soft">
        Every pick saves the moment you make it, and you can change any of them
        until the guild president publishes the ceremony. Results stay sealed until
        then — and once published, they cannot be altered.
      </p>
    </div>
  );
}
