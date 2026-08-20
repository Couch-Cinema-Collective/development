"use client";

import { useEffect, useState, useTransition } from "react";

import { FilmPoster } from "./FilmPoster";
import { nominate, withdrawNomination } from "@/app/nominate/actions";
import { BEST_OF_THE_FEST, type Film } from "@/lib/types";

export interface NominationPickerProps {
  festivalId: string;
  theme: string;
  /** Films from the theme's catalog, shown before anyone searches. */
  catalog: Film[];
  /** The curator's current pick, if they have made one. */
  initialPick: Film | null;
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
  initialSubmitted,
  expected,
  live,
}: NominationPickerProps) {
  const [pick, setPick] = useState<Film | null>(initialPick);
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

  function choose(film: Film) {
    setError(null);
    const previous = pick;
    setPick(film);
    startTransition(async () => {
      const result = await nominate(festivalId, film);
      if (result.error) {
        setError(result.error);
        setPick(previous);
      } else if (typeof result.submitted === "number") {
        setSubmitted(result.submitted);
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
                <button
                  type="button"
                  onClick={withdraw}
                  disabled={pending}
                  className="mt-5 border border-rule px-5 py-2.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors hover:border-ink disabled:opacity-50"
                >
                  Withdraw
                </button>
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
            Curators who have put a film up. Titles stay secret until the
            president sets the lineup — nobody gets to react to anyone
            else&apos;s pick.
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
