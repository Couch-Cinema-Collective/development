"use client";

import { useEffect, useState, useTransition } from "react";

import { FilmPoster } from "./FilmPoster";
import {
  lockNomination,
  nominate,
  savePitch,
  withdrawNomination,
} from "@/app/nominate/actions";
import { BEST_OF_THE_FEST, type Film } from "@/lib/types";

export interface NominationPickerProps {
  festivalId: string;
  theme: string;
  /** Films from the theme's catalog, shown before anyone searches. */
  catalog: Film[];
  /** The curator's current pick, if they have made one. */
  initialPick: Film | null;
  /** Their producer's pitch, if they wrote one. */
  initialPitch: string;
  /** True once the pick has been committed to the programme. */
  initialLocked: boolean;
  initialSubmitted: number;
  expected: number;
  /** False when running on fixtures rather than live TMDB. */
  live: boolean;
}

/**
 * One curator, one film.
 *
 * The old draft board let members spread five points across a shortlist; the
 * festival model replaces that with a single decisive pick, so this screen is
 * built around committing to one title rather than hedging across several.
 */
export function NominationPicker({
  festivalId,
  theme,
  catalog,
  initialPick,
  initialPitch,
  initialLocked,
  initialSubmitted,
  expected,
  live,
}: NominationPickerProps) {
  const [pick, setPick] = useState<Film | null>(initialPick);
  const [pitch, setPitch] = useState(initialPitch);
  const [pitchSaved, setPitchSaved] = useState(false);
  const [locked, setLocked] = useState(initialLocked);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Film[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Debounced search against the proxied TMDB route. Clearing the box resets
  // results synchronously in the input handler, not here.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/films/search?q=${encodeURIComponent(q)}`);
        const data: { films: Film[] } = await res.json();
        setResults(data.films);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function lockIn() {
    if (!pick) return;
    if (
      !window.confirm(
        `Lock in ${pick.title}? This submits it to the programme and cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await lockNomination(festivalId);
      if (result.error) setError(result.error);
      else {
        setLocked(true);
        if (typeof result.submitted === "number") setSubmitted(result.submitted);
      }
    });
  }

  function choose(film: Film) {
    if (locked) return;
    setError(null);
    const previous = pick;
    setPick(film);
    startTransition(async () => {
      const result = await nominate(festivalId, film, pitch);
      if (result.error) {
        setError(result.error);
        setPick(previous);
      } else if (typeof result.submitted === "number") {
        setSubmitted(result.submitted);
      }
    });
  }

  function submitPitch() {
    setError(null);
    startTransition(async () => {
      const result = await savePitch(festivalId, pitch);
      if (result.error) setError(result.error);
      else {
        setPitchSaved(true);
        setTimeout(() => setPitchSaved(false), 2000);
      }
    });
  }

  function withdraw() {
    setError(null);
    const previous = pick;
    setPick(null);
    startTransition(async () => {
      const result = await withdrawNomination(festivalId);
      if (result.error) {
        setError(result.error);
        setPick(previous);
      } else if (typeof result.submitted === "number") {
        setSubmitted(result.submitted);
      }
    });
  }

  const browsing = results ?? catalog;

  // Once locked there is nothing left to do here — showing a live search box
  // under a submitted film invites a curator to try to change it.
  if (locked && pick) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <section className="min-w-0 border border-ink bg-paper-raised p-6">
          <p className="label-eyebrow text-signal">Locked in</p>
          <div className="mt-5 flex flex-wrap items-start gap-6">
            <div className="w-28 shrink-0">
              <FilmPoster film={pick} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-3xl font-medium uppercase leading-none tracking-tight">
                {pick.title}
              </h2>
              <p className="mt-2 text-sm text-ink-faint">
                {pick.year}
                {pick.director ? ` · ${pick.director}` : ""}
              </p>
              {pitch && (
                <blockquote className="mt-4 max-w-md border-l-2 border-signal pl-4 text-sm italic leading-relaxed text-ink-soft">
                  &ldquo;{pitch}&rdquo;
                </blockquote>
              )}
              <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">
                Your submission is in the programme. Nothing more is needed from
                you — the other curators are still picking theirs, and the
                festival starts once your president draws the lineup.
              </p>
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <section className="border border-rule bg-paper-raised px-5 py-5">
            <h2 className="label-eyebrow border-b border-rule pb-2">
              The programme
            </h2>
            <p className="mt-4 text-4xl font-medium tabular-nums leading-none">
              {submitted}
              <span className="text-ink-faint"> / {expected}</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">
              Curators who have locked a film in. Titles stay secret until the
              lineup is drawn.
            </p>
          </section>
        </aside>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        {/* ── Your pick ──────────────────────────────────────────────────── */}
        <section
          className={`border p-6 ${pick ? "border-ink bg-paper-raised" : "border-dashed border-rule"}`}
        >
          <p className="label-eyebrow text-signal">Your film</p>

          {pick ? (
            <div className="mt-4 flex flex-wrap items-start gap-6">
              <div className="w-24 shrink-0">
                <FilmPoster film={pick} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-3xl font-medium uppercase leading-none tracking-tight">
                  {pick.title}
                </h2>
                <p className="mt-2 text-sm text-ink-faint">
                  {pick.year}
                  {pick.director ? ` · ${pick.director}` : ""}
                  {pick.runtime ? ` · ${pick.runtime} min` : ""}
                </p>
                {pick.overview && (
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
                    {pick.overview}
                  </p>
                )}
                <div className="mt-5 max-w-lg">
                  <label
                    htmlFor="producers-pitch"
                    className="label-eyebrow block"
                  >
                    The producer&apos;s pitch · optional
                  </label>
                  <textarea
                    id="producers-pitch"
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value.slice(0, 200))}
                    rows={3}
                    placeholder="Why this film? Shown on its card all festival — anonymously, until the ceremony."
                    className="mt-2 w-full resize-y border border-rule bg-transparent p-3 text-sm leading-relaxed outline-none placeholder:text-ink-faint focus:border-signal"
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={submitPitch}
                      disabled={pending}
                      className="border border-rule px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors hover:border-ink disabled:opacity-50"
                    >
                      {pitchSaved ? "Saved ✓" : "Save pitch"}
                    </button>
                    <span className="text-xs tabular-nums text-ink-faint">
                      {pitch.length}/200
                    </span>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={lockIn}
                    disabled={pending}
                    className="bg-signal px-7 py-3.5 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink disabled:opacity-40"
                  >
                    {pending ? "Working…" : "Lock in this film"}
                  </button>
                  <button
                    type="button"
                    onClick={withdraw}
                    disabled={pending}
                    className="border border-rule px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] transition-colors hover:border-ink disabled:opacity-50"
                  >
                    Withdraw
                  </button>
                </div>
                <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-faint">
                  Locking submits it to the programme and can&apos;t be undone.
                  Only locked films make the lineup.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
              You haven&apos;t put a film up yet. Search below and pick one —
              you can change it any time before nominations close.
            </p>
          )}
        </section>

        {error && (
          <p className="mt-4 border border-signal bg-paper-raised px-4 py-3 text-sm text-signal">
            {error}
          </p>
        )}

        {/* ── Find a film ────────────────────────────────────────────────── */}
        <section className="mt-10">
          <label
            htmlFor="film-search"
            className="label-eyebrow block border-b border-rule pb-2"
          >
            {results ? "Search results" : `${theme} — a place to start`}
          </label>
          <input
            id="film-search"
            type="search"
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              if (!value.trim()) {
                setResults(null);
                setSearching(false);
              } else {
                setSearching(true);
              }
            }}
            placeholder="Search any film…"
            className="mt-4 w-full border border-rule bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
          />

          {searching && (
            <p className="mt-3 text-xs text-ink-faint">Searching…</p>
          )}
          {!live && (
            <p className="mt-3 text-xs text-ink-faint">
              Running on fixtures — add a TMDB key for the live catalog.
            </p>
          )}

          <ul className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-2">
            {browsing.map((film) => {
              const chosen = pick?.id === film.id;
              return (
                <li key={film.id} className="bg-paper-raised">
                  <button
                    type="button"
                    onClick={() => choose(film)}
                    disabled={pending || chosen}
                    className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-paper disabled:cursor-default"
                  >
                    <span className="block w-14 shrink-0">
                      <FilmPoster film={film} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium tracking-tight">
                        {film.title}
                      </span>
                      <span className="mt-1 block text-xs text-ink-faint">
                        {film.year}
                        {film.director ? ` · ${film.director}` : ""}
                      </span>
                      <span
                        className={`mt-2 block text-xs font-medium uppercase tracking-[0.12em] ${
                          chosen ? "text-signal" : "text-ink-faint"
                        }`}
                      >
                        {chosen ? "Your pick ✓" : "Put it up"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {browsing.length === 0 && !searching && (
              <li className="bg-paper-raised px-4 py-6 text-sm text-ink-faint">
                Nothing found. Try another title.
              </li>
            )}
          </ul>
        </section>
      </div>

      {/* ── Who has filed ─────────────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <section className="border border-rule bg-paper-raised px-5 py-5">
          <h2 className="label-eyebrow border-b border-rule pb-2">
            The programme
          </h2>
          <p className="mt-4 text-4xl font-medium tabular-nums leading-none">
            {submitted}
            <span className="text-ink-faint"> / {expected}</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            Curators who have locked a film in. Titles stay secret until the
            lineup is drawn — nobody gets to react to anyone else&apos;s pick.
          </p>
        </section>

        <section className="mt-8 border border-rule bg-paper-raised px-5 py-5">
          <h2 className="label-eyebrow border-b border-rule pb-2">
            What it&apos;s worth
          </h2>
          <p className="mt-4 text-xs leading-relaxed text-ink-soft">
            If your film takes {BEST_OF_THE_FEST}, the win is yours — it goes on
            your record as the curator who backed it. Every other award is
            honorary.
          </p>
        </section>
      </aside>
    </div>
  );
}
