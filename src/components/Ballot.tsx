"use client";

import { useState } from "react";
import Link from "next/link";

import { FilmPoster } from "./FilmPoster";
import type { AwardCategory, Ballot as BallotType, Film } from "@/lib/types";

interface BallotProps {
  awards: AwardCategory[];
  slate: Film[];
  watchedIds: number[];
}

export function Ballot({ awards, slate, watchedIds }: BallotProps) {
  const [overrideGate, setOverrideGate] = useState(false);
  const [ballot, setBallot] = useState<BallotType>({});
  const [submitted, setSubmitted] = useState(false);

  const unwatched = slate.filter((f) => !watchedIds.includes(f.id));
  const gated = unwatched.length > 0 && !overrideGate;

  if (gated) {
    return (
      <section className="max-w-xl border border-ink bg-paper-raised p-8">
        <p className="label-eyebrow text-signal">Ballot locked</p>
        <h2 className="mt-3 text-3xl font-medium uppercase leading-tight tracking-tight">
          {watchedIds.length} of {slate.length} watched
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Voting opens once you&apos;ve finished the slate. Missing a film
          doesn&apos;t cost you anything except this round&apos;s vote.
        </p>

        <ul className="mt-6 space-y-2">
          {unwatched.map((film) => (
            <li key={film.id} className="flex items-baseline gap-3 text-sm">
              <span className="size-1.5 shrink-0 rounded-full bg-signal" />
              <span>{film.title}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/season"
            className="bg-ink px-6 py-3 text-xs uppercase tracking-[0.12em] text-paper transition-colors hover:bg-signal"
          >
            Back to the season
          </Link>
          <button
            type="button"
            onClick={() => setOverrideGate(true)}
            className="border border-rule px-6 py-3 text-xs uppercase tracking-[0.12em] transition-colors hover:border-ink"
          >
            Skip the gate — prototype
          </button>
        </div>
      </section>
    );
  }

  if (submitted) {
    const cast = Object.keys(ballot).length;
    return (
      <section className="max-w-xl">
        <p className="label-eyebrow text-signal">Ballot cast</p>
        <h2 className="mt-3 text-4xl font-medium uppercase leading-none tracking-tight">
          {cast} of {awards.length}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Your votes are in. Results stay sealed until the commissioner publishes
          them — and they cannot change a single one.
        </p>
        <Link
          href="/ceremony"
          className="mt-8 inline-block bg-signal px-7 py-3.5 text-sm uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink"
        >
          Preview the ceremony
        </Link>
      </section>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 border-b border-rule bg-paper/95 px-6 py-4 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <span className="label-eyebrow">Your ballot</span>
          <span className="text-sm tabular-nums">
            {Object.keys(ballot).length} / {awards.length}
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
                      onClick={() =>
                        setBallot((prev) => ({ ...prev, [award.id]: film.id }))
                      }
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

      <button
        type="button"
        onClick={() => setSubmitted(true)}
        disabled={Object.keys(ballot).length === 0}
        className="mt-16 w-full bg-ink px-6 py-5 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-signal disabled:opacity-30 disabled:hover:bg-ink"
      >
        Cast ballot
      </button>
    </div>
  );
}
