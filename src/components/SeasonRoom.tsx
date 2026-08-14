"use client";

import { useState } from "react";

import { FilmPoster } from "./FilmPoster";
import { DiscordPanel } from "./DiscordPanel";
import type { Film, Member, Review } from "@/lib/types";

interface SeasonRoomProps {
  slate: Film[];
  reviews: Review[];
  membersById: Record<string, Member>;
  currentMemberId: string;
  initiallyWatched: number[];
}

export function SeasonRoom({
  slate,
  reviews,
  membersById,
  currentMemberId,
  initiallyWatched,
}: SeasonRoomProps) {
  const [watched, setWatched] = useState<number[]>(initiallyWatched);
  const [allReviews, setAllReviews] = useState<Review[]>(reviews);
  const [openFilmId, setOpenFilmId] = useState<number | null>(null);

  const toggleWatched = (filmId: number) =>
    setWatched((prev) =>
      prev.includes(filmId) ? prev.filter((id) => id !== filmId) : [...prev, filmId],
    );

  const addReview = (filmId: number, rating: number, body: string) => {
    setAllReviews((prev) => [
      ...prev.filter(
        (r) => !(r.filmId === filmId && r.memberId === currentMemberId),
      ),
      {
        id: `r-${Date.now()}`,
        filmId,
        memberId: currentMemberId,
        rating,
        body,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const eligible = watched.length === slate.length;

  return (
    <div className="space-y-14">
      <ProgressBar watchedCount={watched.length} total={slate.length} eligible={eligible} />

      <section>
        <h2 className="label-eyebrow">The slate</h2>

        <ul className="mt-5 border-t border-rule">
          {slate.map((film) => (
            <FilmRow
              key={film.id}
              film={film}
              watched={watched.includes(film.id)}
              onToggleWatched={() => toggleWatched(film.id)}
              open={openFilmId === film.id}
              onToggleOpen={() =>
                setOpenFilmId((prev) => (prev === film.id ? null : film.id))
              }
              reviews={allReviews.filter((r) => r.filmId === film.id)}
              membersById={membersById}
              currentMemberId={currentMemberId}
              onSubmitReview={(rating, body) => addReview(film.id, rating, body)}
            />
          ))}
        </ul>
      </section>

      <DiscordPanel />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ProgressBar({
  watchedCount,
  total,
  eligible,
}: {
  watchedCount: number;
  total: number;
  eligible: boolean;
}) {
  return (
    <div className="border border-ink bg-paper-raised px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow">Your progress</p>
          <p className="mt-2 text-4xl font-medium leading-none tabular-nums">
            {watchedCount}
            <span className="text-ink-faint"> / {total}</span>
          </p>
        </div>

        <p className="max-w-xs text-xs leading-relaxed text-ink-soft">
          {eligible
            ? "You've watched everything. Your ballot is unlocked for every category."
            : `Watch the remaining ${total - watchedCount} to unlock the full ballot. Miss one and you simply skip that vote.`}
        </p>
      </div>

      <div className="mt-5 flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 ${i < watchedCount ? "bg-signal" : "bg-rule"}`}
          />
        ))}
      </div>
    </div>
  );
}

function FilmRow({
  film,
  watched,
  onToggleWatched,
  open,
  onToggleOpen,
  reviews,
  membersById,
  currentMemberId,
  onSubmitReview,
}: {
  film: Film;
  watched: boolean;
  onToggleWatched: () => void;
  open: boolean;
  onToggleOpen: () => void;
  reviews: Review[];
  membersById: Record<string, Member>;
  currentMemberId: string;
  onSubmitReview: (rating: number, body: string) => void;
}) {
  const mine = reviews.find((r) => r.memberId === currentMemberId);
  const others = reviews.filter((r) => r.memberId !== currentMemberId);

  const guildAverage =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  return (
    <li className="border-b border-rule">
      <div className="flex items-center gap-5 py-5">
        <div className="w-16 shrink-0">
          <FilmPoster film={film} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg tracking-tight">{film.title}</p>
          <p className="truncate text-xs text-ink-faint">
            {film.director} · {film.year}
            {film.runtime ? ` · ${film.runtime}m` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {guildAverage !== null && (
              <span className="font-medium text-signal">
                Guild {guildAverage.toFixed(1)} / 5
              </span>
            )}
            <span className="text-ink-faint">
              TMDB {film.voteAverage.toFixed(1)}
            </span>
            {film.externalScores?.imdb !== undefined && (
              <span className="text-ink-faint">
                IMDb {film.externalScores.imdb.toFixed(1)}
              </span>
            )}
            {film.externalScores?.rottenTomatoes !== undefined && (
              <span className="text-ink-faint">
                RT {film.externalScores.rottenTomatoes}%
              </span>
            )}
            {film.externalScores?.metacritic !== undefined && (
              <span className="text-ink-faint">
                MC {film.externalScores.metacritic}
              </span>
            )}
            <span className="text-ink-faint">
              {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleWatched}
            aria-pressed={watched}
            className={`border px-4 py-2 text-xs uppercase tracking-[0.1em] transition-colors ${
              watched
                ? "border-signal bg-signal text-paper"
                : "border-rule hover:border-ink"
            }`}
          >
            {watched ? "Watched" : "Mark watched"}
          </button>

          <button
            type="button"
            onClick={onToggleOpen}
            className="border border-rule px-3 py-2 text-xs transition-colors hover:border-ink"
            aria-expanded={open}
          >
            {open ? "−" : "+"}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-10 pb-8 lg:grid-cols-2">
          <div>
            <h3 className="label-eyebrow">
              {mine ? "Your review" : "Leave a review"}
            </h3>
            {watched ? (
              <ReviewForm existing={mine} onSubmit={onSubmitReview} />
            ) : (
              <p className="mt-3 border border-dashed border-rule px-4 py-6 text-xs text-ink-faint">
                Mark it watched first. Reviews come from people who saw it.
              </p>
            )}
          </div>

          <div>
            <h3 className="label-eyebrow">The guild</h3>
            {others.length === 0 ? (
              <p className="mt-3 text-xs text-ink-faint">
                Nobody else has written this one up yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-5">
                {others.map((review) => (
                  <li key={review.id} className="border-l-2 border-rule pl-4">
                    <p className="flex items-baseline gap-3">
                      <span className="text-sm font-medium">
                        {membersById[review.memberId]?.name ?? "Unknown"}
                      </span>
                      <Stars rating={review.rating} />
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {review.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`${rating} out of 5`}>
      <span className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-0.5 ${i < rating * 2 ? "bg-signal" : "bg-rule"}`}
          />
        ))}
      </span>
      <span className="text-xs tabular-nums text-ink-faint">
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

function ReviewForm({
  existing,
  onSubmit,
}: {
  existing?: Review;
  onSubmit: (rating: number, body: string) => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rating === 0 || !body.trim()) return;
        onSubmit(rating, body.trim());
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }}
      className="mt-3"
    >
      <div className="flex items-center gap-3">
        <span className="flex gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => {
            const value = (i + 1) / 2;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setRating(value)}
                aria-label={`${value} out of 5`}
                className={`h-6 w-2 transition-colors ${
                  value <= rating ? "bg-signal" : "bg-rule hover:bg-ink-faint"
                }`}
              />
            );
          })}
        </span>
        <span className="text-sm tabular-nums">
          {rating > 0 ? rating.toFixed(1) : "—"} / 5
        </span>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="What did you make of it?"
        className="mt-4 w-full resize-y border border-rule bg-transparent p-3 text-sm leading-relaxed outline-none placeholder:text-ink-faint focus:border-signal"
      />

      <div className="mt-3 flex items-center gap-4">
        <button
          type="submit"
          disabled={rating === 0 || !body.trim()}
          className="bg-ink px-5 py-2.5 text-xs uppercase tracking-[0.12em] text-paper transition-colors hover:bg-signal disabled:opacity-30 disabled:hover:bg-ink"
        >
          {existing ? "Update review" : "Post review"}
        </button>
        {saved && <span className="text-xs text-signal">Saved.</span>}
      </div>
    </form>
  );
}
