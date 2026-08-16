"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { FilmPoster } from "./FilmPoster";
import { castVote } from "@/app/vote/actions";
import {
  needsPerformer,
  type AwardCategory,
  type Ballot as BallotType,
  type CastMember,
  type Film,
} from "@/lib/types";

interface BallotProps {
  seasonId: string;
  awards: AwardCategory[];
  slate: Film[];
  watchedIds: number[];
  /** Saved picks: award id → tmdb id. */
  initialBallot: BallotType;
  /** Saved performer picks for the acting categories: award id → cast member. */
  initialPerformers: Record<string, CastMember>;
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
  initialPerformers,
  honorGate,
}: BallotProps) {
  const [ballot, setBallot] = useState<BallotType>(initialBallot);
  const [performers, setPerformers] =
    useState<Record<string, CastMember>>(initialPerformers);
  const [castByFilm, setCastByFilm] = useState<Record<number, CastMember[]>>({});
  const [loadingCast, setLoadingCast] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  /** Billing order comes straight from TMDB; cached per film for the session. */
  const loadCast = useCallback(
    async (filmId: number) => {
      if (castByFilm[filmId]) return;
      setLoadingCast(filmId);
      try {
        const res = await fetch(`/api/films/cast?id=${filmId}`);
        const data: { cast: CastMember[] } = await res.json();
        setCastByFilm((prev) => ({ ...prev, [filmId]: data.cast ?? [] }));
      } catch {
        setCastByFilm((prev) => ({ ...prev, [filmId]: [] }));
      } finally {
        setLoadingCast(null);
      }
    },
    [castByFilm],
  );

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

  function save(awardId: string, filmId: number, person?: CastMember) {
    setSaveState("saving");
    setSaveError(null);
    void castVote({ seasonId, awardId, tmdbId: filmId, person }).then(
      (result) => {
        if (result.error) {
          setSaveState("error");
          setSaveError(result.error);
          return;
        }
        setSaveState("saved");
      },
    );
  }

  function pick(award: AwardCategory, filmId: number) {
    const previous = ballot[award.id];
    if (previous === filmId) return;

    setBallot((prev) => ({ ...prev, [award.id]: filmId }));

    if (needsPerformer(award)) {
      // Switching films invalidates the performer — they weren't in this one.
      setPerformers((prev) => {
        const next = { ...prev };
        delete next[award.id];
        return next;
      });
      void loadCast(filmId);
      // Hold the write until a performer is chosen, so a half-made acting
      // vote never lands in the database.
      setSaveState("idle");
      return;
    }

    save(award.id, filmId);
  }

  function pickPerformer(award: AwardCategory, person: CastMember) {
    const filmId = ballot[award.id];
    if (filmId === undefined) return;
    setPerformers((prev) => ({ ...prev, [award.id]: person }));
    save(award.id, filmId, person);
  }

  /** An acting award only counts once a performer is named. */
  function isComplete(award: AwardCategory): boolean {
    if (ballot[award.id] === undefined) return false;
    return needsPerformer(award) ? Boolean(performers[award.id]) : true;
  }

  const cast = awards.filter(isComplete).length;

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
              className={`h-1 flex-1 ${isComplete(award) ? "bg-signal" : "bg-rule"}`}
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
                      onClick={() => pick(award, film.id)}
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

            {needsPerformer(award) && ballot[award.id] !== undefined && (
              <PerformerPicker
                award={award}
                cast={castByFilm[ballot[award.id]]}
                loading={loadingCast === ballot[award.id]}
                selected={performers[award.id]}
                onSelect={(person) => pickPerformer(award, person)}
              />
            )}
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

/* ------------------------------------------------------------------ */

/**
 * Acting categories need a person, not just a film. Top five billed, in TMDB's
 * own billing order — no ranking of ours.
 */
function PerformerPicker({
  award,
  cast,
  loading,
  selected,
  onSelect,
}: {
  award: AwardCategory;
  cast: CastMember[] | undefined;
  loading: boolean;
  selected: CastMember | undefined;
  onSelect: (person: CastMember) => void;
}) {
  if (loading || !cast) {
    return (
      <p className="mt-6 border-t border-rule pt-5 text-xs text-ink-faint">
        Loading the cast…
      </p>
    );
  }

  if (cast.length === 0) {
    return (
      <p className="mt-6 border-t border-rule pt-5 text-xs text-ink-faint">
        No cast on file for that film — this category can&apos;t be completed for
        it.
      </p>
    );
  }

  return (
    <fieldset className="mt-6 border-t border-rule pt-5">
      <legend className="sr-only">Choose a performer for {award.name}</legend>

      <p className={`label-eyebrow ${selected ? "" : "text-signal"}`}>
        {selected ? "Your pick" : "Now choose the performance"}
      </p>

      <ul className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5">
        {cast.map((person) => {
          const chosen = selected?.id === person.id;
          const headshot = person.profilePath
            ? `https://image.tmdb.org/t/p/w185${person.profilePath}`
            : null;

          return (
            <li key={person.id}>
              <label
                className={`block cursor-pointer text-left transition-opacity ${
                  chosen ? "" : "opacity-60 hover:opacity-100"
                }`}
              >
                <input
                  type="radio"
                  name={`performer-${award.id}`}
                  checked={chosen}
                  onChange={() => onSelect(person)}
                  className="sr-only"
                />

                <span className="relative block aspect-[2/3] overflow-hidden bg-ink">
                  {headshot ? (
                    <Image
                      src={headshot}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 30vw, 140px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center p-2 text-center text-xs uppercase leading-tight tracking-tight text-paper/70">
                      {person.name}
                    </span>
                  )}
                  {chosen && (
                    <span className="absolute inset-0 border-[3px] border-signal" />
                  )}
                </span>

                <span
                  className={`mt-2 block truncate text-xs ${
                    chosen ? "font-medium text-signal" : ""
                  }`}
                >
                  {person.name}
                </span>
                {person.character && (
                  <span className="block truncate text-xs text-ink-faint">
                    {person.character}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
