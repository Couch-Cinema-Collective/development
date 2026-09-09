"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { Countdown } from "./Countdown";
import { FilmPoster } from "./FilmPoster";
import { syncFestivalClock, tapHaptic } from "@/lib/native";
import {
  allocateUpvote,
  reportReview,
  saveReview,
  setWatched,
  type UpvoteKind,
} from "@/app/dashboard/actions";
import {
  PHASE_LABELS,
  allClosed,
  notYetOpen,
  phaseDeadline,
  phaseOf,
} from "@/lib/lineup";
import {
  REVIEW_MAX_CHARS,
  UPVOTES_PER_FILM,
  VOICE_OF_THE_PEOPLE,
  type LineupFilm,
  type ScreeningPhase,
} from "@/lib/types";

/** One entry in the review thread, as film_reviews() returns it. */
export interface ThreadReview {
  id: string;
  /** Withheld until the voting window shuts — anonymity is the point. */
  authorName: string | null;
  body: string;
  eligible: boolean;
  insightful: number;
  funniest: number;
  /** The signed-in member's stacked allocation on this review, per kind. */
  myInsightful: number;
  myFunniest: number;
  mine: boolean;
  /** Whether the signed-in member already flagged this review. */
  reportedByMe: boolean;
}

export interface DashboardProps {
  festivalId: string;
  guildId: string;
  guildName: string;
  festivalNumber: number;
  theme: string;
  lineup: LineupFilm[];
  /** The film the festival is on right now, if any. */
  current: LineupFilm | null;
  next: LineupFilm | null;
  watchedIds: number[];
  /** Reviews for the current film only — the rest are read on its own page. */
  thread: ThreadReview[];
  myReview: string;
  insightfulSpent: number;
  funniestSpent: number;
  /** The curator's anonymous Producer's Pitch for the current film. */
  pitch: string;
  /** Standing: what this member has earned so far. */
  upvotesEarned: number;
  /** The Best Critic board — revealed weeks only, names resolved. */
  leaderboard: { name: string; points: number; me: boolean }[];
  /** Watch windows this member let close unwatched. >0 means: can't win. */
  myMisses: number;
  reviewsFiled: number;
  festivalAwards: number;
  /** Curators have a film in the lineup; critics do not. */
  isCurator: boolean;
  /**
   * The lineup is drawn but carries no schedule yet — the president has not
   * opened the festival. Distinct from an empty lineup, and from one that has
   * finished.
   */
  drawnButNotOpen: number;
}

export function Dashboard({
  festivalId,
  guildId,
  guildName,
  festivalNumber,
  theme,
  lineup,
  current,
  next,
  watchedIds,
  thread,
  myReview,
  insightfulSpent,
  funniestSpent,
  pitch,
  upvotesEarned,
  leaderboard,
  myMisses,
  reviewsFiled,
  festivalAwards,
  isCurator,
  drawnButNotOpen,
}: DashboardProps) {
  const [watched, setWatchedState] = useState(new Set(watchedIds));
  const [reviewText, setReviewText] = useState(myReview);
  const [reviews, setReviews] = useState(thread);
  const [spent, setSpent] = useState<Record<UpvoteKind, number>>({
    insightful: insightfulSpent,
    funniest: funniestSpent,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const phase: ScreeningPhase | null = current ? phaseOf(current) : null;
  const deadline = current ? phaseDeadline(current) : null;
  const isWatched = current ? watched.has(current.film.id) : false;
  const remaining: Record<UpvoteKind, number> = {
    insightful: UPVOTES_PER_FILM - spent.insightful,
    funniest: UPVOTES_PER_FILM - spent.funniest,
  };

  const progress = useMemo(
    () => lineup.filter((f) => phaseOf(f) === "CLOSED").length,
    [lineup],
  );

  // Mirror the festival clock onto the iOS widget and Live Activity. On the
  // web this is a no-op; on device it keeps the Lock Screen honest.
  const deadlineMs = deadline ? new Date(deadline).getTime() : null;
  const filmCount = lineup.length;
  useEffect(() => {
    void syncFestivalClock(
      current && phase && phase !== "CLOSED"
        ? {
            guildName,
            filmTitle: current.film.title,
            phaseLabel: PHASE_LABELS[phase],
            deadline: deadlineMs,
            position: current.position,
            filmCount,
          }
        : null,
    );
  }, [current, phase, deadlineMs, guildName, filmCount]);

  function onWatch(next: boolean) {
    if (!current) return;
    void tapHaptic();
    const id = current.film.id;
    setWatchedState((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
    startTransition(async () => {
      const result = await setWatched(festivalId, id, next);
      if (result.error) {
        setError(result.error);
        // Put the checkbox back where the server thinks it should be.
        setWatchedState((prev) => {
          const copy = new Set(prev);
          if (next) copy.delete(id);
          else copy.add(id);
          return copy;
        });
      }
    });
  }

  function onSaveReview() {
    if (!current) return;
    setError(null);
    startTransition(async () => {
      const result = await saveReview(festivalId, current.film.id, reviewText);
      if (result.error) setError(result.error);
      else {
        void tapHaptic();
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  /** Move one of the six weekly votes (3 insightful, 3 funniest). */
  function onAllocate(reviewId: string, kind: UpvoteKind, add: boolean) {
    if (!current) return;
    if (add && remaining[kind] <= 0) {
      setError(`All ${UPVOTES_PER_FILM} ${kind} upvotes are spent on this film.`);
      return;
    }
    setError(null);

    const field = kind === "insightful" ? "myInsightful" : "myFunniest";
    const delta = add ? 1 : -1;
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId ? { ...r, [field]: r[field] + delta } : r,
      ),
    );
    setSpent((prev) => ({ ...prev, [kind]: prev[kind] + delta }));
    void tapHaptic();

    startTransition(async () => {
      const result = await allocateUpvote(
        festivalId,
        current.film.id,
        reviewId,
        kind,
        add,
      );
      if (result.error) {
        setError(result.error);
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, [field]: r[field] - delta } : r,
          ),
        );
        setSpent((prev) => ({ ...prev, [kind]: prev[kind] - delta }));
      } else {
        setSpent({
          insightful: UPVOTES_PER_FILM - (result.insightfulRemaining ?? 0),
          funniest: UPVOTES_PER_FILM - (result.funniestRemaining ?? 0),
        });
      }
    });
  }

  /** Flag a review for the president. Optimistic, like upvotes. */
  function onReport(reviewId: string) {
    setError(null);
    void tapHaptic();
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, reportedByMe: true } : r)),
    );
    startTransition(async () => {
      const result = await reportReview(reviewId);
      if (result.error) {
        setError(result.error);
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, reportedByMe: false } : r,
          ),
        );
      }
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-10">
        {myMisses > 0 && (
          <p className="border border-signal bg-paper-raised px-5 py-4 text-sm leading-relaxed">
            <span className="font-medium text-signal">
              You missed {myMisses} watch window{myMisses === 1 ? "" : "s"}.
            </span>{" "}
            The film stays, your reviews and votes still count — but you can
            no longer win this festival&apos;s awards.
          </p>
        )}

        {/* ── What you owe right now ─────────────────────────────────────── */}
        {current && phase && deadline ? (
          <section className="border border-ink bg-paper-raised">
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule px-6 py-4">
              <p className="label-eyebrow text-signal">
                {PHASE_LABELS[phase]} · Film {current.position} of{" "}
                {lineup.length}
              </p>
              <p className="label-eyebrow">
                {guildName} · Festival {festivalNumber}
              </p>
            </div>

            <div className="grid gap-8 px-6 py-8 sm:grid-cols-[128px_1fr]">
              <div className="w-32">
                <FilmPoster film={current.film} />
              </div>

              <div className="min-w-0">
                <h2 className="break-words text-3xl font-medium uppercase leading-none tracking-tight sm:text-4xl">
                  {current.film.title}
                </h2>
                <p className="mt-2 text-sm text-ink-faint">
                  {current.film.year}
                  {current.film.director ? ` · ${current.film.director}` : ""}
                  {current.film.runtime ? ` · ${current.film.runtime} min` : ""}
                </p>
                {pitch && (
                  <blockquote className="mt-4 max-w-lg border-l-2 border-signal pl-4">
                    <p className="text-sm italic leading-relaxed text-ink-soft">
                      &ldquo;{pitch}&rdquo;
                    </p>
                    <p className="label-eyebrow mt-1.5">
                      The producer&apos;s pitch · curator anonymous
                    </p>
                  </blockquote>
                )}

                <div className="mt-7">
                  <p className="label-eyebrow">{DEADLINE_LABEL[phase]}</p>
                  <div className="mt-2">
                    <Countdown deadline={deadline} expiredLabel="Just closed" />
                  </div>
                </div>
              </div>
            </div>

            {/* The single action this phase asks for. */}
            <div className="border-t border-rule px-6 py-6">
              {phase === "VIEWING" && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-tight">
                      {isWatched ? "Watched" : "Watch it before Sunday midnight"}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      Write it up any time before the window shuts — voting on
                      reviews opens Monday.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onWatch(!isWatched)}
                    disabled={pending}
                    className={`px-7 py-3.5 text-sm font-medium uppercase tracking-[0.14em] transition-colors disabled:opacity-50 ${
                      isWatched
                        ? "border border-ink text-ink hover:bg-ink hover:text-paper"
                        : "bg-signal text-paper hover:bg-ink"
                    }`}
                  >
                    {isWatched ? "Watched ✓" : "Mark watched"}
                  </button>
                </div>
              )}

              {(phase === "VIEWING" || phase === "REVIEWING") && (
                <div className={phase === "VIEWING" ? "pt-6" : ""}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-sm font-medium uppercase tracking-tight">
                      Your review
                    </p>
                    <p
                      className={`label-eyebrow ${
                        reviewText.length > REVIEW_MAX_CHARS ? "text-signal" : ""
                      }`}
                    >
                      {reviewText.length} / {REVIEW_MAX_CHARS}
                    </p>
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    maxLength={REVIEW_MAX_CHARS}
                    rows={3}
                    placeholder="Two hundred characters. Nobody sees your name until voting closes."
                    className="mt-3 w-full resize-none border border-rule bg-paper px-4 py-3 text-sm leading-relaxed outline-none focus:border-ink"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-ink-faint">
                      Anonymous until the voting window shuts. Editable until
                      voting opens Monday.
                    </p>
                    <button
                      type="button"
                      onClick={onSaveReview}
                      disabled={pending || !reviewText.trim()}
                      className="bg-signal px-7 py-3 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink disabled:opacity-50"
                    >
                      {saved ? "Filed ✓" : "File review"}
                    </button>
                  </div>
                </div>
              )}

              {phase === "CRITICS_VOTING" && (
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-sm font-medium uppercase tracking-tight">
                      Spend your upvotes — {UPVOTES_PER_FILM} insightful,{" "}
                      {UPVOTES_PER_FILM} funniest
                    </p>
                    <p
                      className={`label-eyebrow ${remaining.insightful + remaining.funniest > 0 ? "text-signal" : ""}`}
                    >
                      {remaining.insightful} insightful · {remaining.funniest}{" "}
                      funniest left
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">
                    Spend all {UPVOTES_PER_FILM} or your own review stops being
                    eligible to receive any.
                  </p>

                  <ul className="mt-5 grid gap-px border border-rule bg-rule">
                    {reviews.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-start gap-4 bg-paper px-4 py-4"
                      >
                        <p className="min-w-0 flex-1 text-sm leading-relaxed">
                          {r.body}
                          {r.mine && (
                            <span className="ml-2 text-xs text-ink-faint">
                              (yours)
                            </span>
                          )}
                        </p>
                        {!r.mine && (
                          <span className="flex shrink-0 flex-wrap items-center gap-2">
                            <AllocateControl
                              label="Insightful"
                              count={r.myInsightful}
                              canAdd={!pending && remaining.insightful > 0}
                              onAdd={() => onAllocate(r.id, "insightful", true)}
                              onRemove={() =>
                                onAllocate(r.id, "insightful", false)
                              }
                            />
                            <AllocateControl
                              label="Funniest"
                              count={r.myFunniest}
                              canAdd={!pending && remaining.funniest > 0}
                              onAdd={() => onAllocate(r.id, "funniest", true)}
                              onRemove={() =>
                                onAllocate(r.id, "funniest", false)
                              }
                            />
                            <ReportButton
                              reported={r.reportedByMe}
                              onReport={() => onReport(r.id)}
                            />
                          </span>
                        )}
                      </li>
                    ))}
                    {reviews.length === 0 && (
                      <li className="bg-paper px-4 py-6 text-sm text-ink-faint">
                        No reviews were filed for this one.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {phase === "UPCOMING" && (
                <p className="text-sm text-ink-soft">
                  This film opens when the one before it closes.
                </p>
              )}
            </div>
          </section>
        ) : drawnButNotOpen > 0 ? (
          <section className="border border-ink bg-paper-raised px-6 py-10">
            <p className="label-eyebrow text-signal">Ready to open</p>
            <p className="mt-3 text-3xl font-medium uppercase leading-tight tracking-tight">
              The lineup is drawn
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
              {drawnButNotOpen} film{drawnButNotOpen === 1 ? "" : "s"} are
              programmed and in order. There is no clock yet — the first film
              opens the moment your president opens the festival, and you will
              have the full window from then.
            </p>
          </section>
        ) : notYetOpen(lineup) ? (
          <section className="border border-ink bg-paper-raised px-6 py-10">
            <p className="label-eyebrow text-signal">Ready to open</p>
            <p className="mt-3 text-3xl font-medium uppercase leading-tight tracking-tight">
              The lineup is drawn
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
              {lineup.length} film{lineup.length === 1 ? "" : "s"} are
              programmed and in order. Nothing is screening yet — the first
              film opens the moment your president opens the festival, and the
              clock starts from then.
            </p>
          </section>
        ) : allClosed(lineup) ? (
          <section className="border border-rule bg-paper-raised px-6 py-10">
            <p className="label-eyebrow">The festival has screened</p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
              Every film in the lineup has closed. The ceremony is next — your
              president opens the ballot when they&apos;re ready.
            </p>
          </section>
        ) : (
          <section className="border border-rule bg-paper-raised px-6 py-10">
            <p className="label-eyebrow">Nothing programmed yet</p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
              There is no lineup for this festival yet. Once curators lock in
              their films and your president draws the lineup, the clock
              appears here.
            </p>
          </section>
        )}

        {error && (
          <p className="border border-signal bg-paper-raised px-4 py-3 text-sm text-signal">
            {error}
          </p>
        )}

        {/* ── The lineup, and where the festival has got to ──────────────── */}
        <section>
          <div className="flex items-baseline justify-between border-b border-rule pb-2">
            <h2 className="label-eyebrow">The lineup</h2>
            <p className="label-eyebrow">
              {progress} of {lineup.length} closed
            </p>
          </div>

          <ul className="mt-4 grid gap-px border border-rule bg-rule">
            {lineup.map((entry) => {
              const p = phaseOf(entry);
              const isCurrent = current?.film.id === entry.film.id;
              return (
                <li key={entry.film.id}>
                  <Link
                    href={`/guild/${guildId}/film/${entry.film.id}`}
                    className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4 transition-colors ${
                      isCurrent
                        ? "bg-paper-raised hover:bg-paper"
                        : "bg-paper hover:bg-paper-raised"
                    }`}
                  >
                    <span className="flex min-w-0 items-baseline gap-3">
                      <span className="label-eyebrow tabular-nums">
                        {String(entry.position).padStart(2, "0")}
                      </span>
                      <span
                        className={`truncate text-sm font-medium tracking-tight ${
                          p === "UPCOMING" ? "text-ink-faint" : ""
                        }`}
                      >
                        {entry.film.title}
                      </span>
                      {watched.has(entry.film.id) && (
                        <span className="label-eyebrow">Watched</span>
                      )}
                    </span>
                    <span
                      className={`label-eyebrow ${isCurrent ? "text-signal" : ""}`}
                    >
                      {PHASE_LABELS[p]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* ── Standing, and what is coming ──────────────────────────────────── */}
      <aside className="space-y-8 lg:sticky lg:top-8 lg:self-start">
        <section className="border border-rule bg-paper-raised px-5 py-5">
          <h2 className="label-eyebrow border-b border-rule pb-2">
            Your festival
          </h2>
          <dl className="mt-4 grid gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-ink-soft">Upvotes earned</dt>
              <dd className="text-2xl font-medium tabular-nums">
                {upvotesEarned}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-ink-soft">Reviews filed</dt>
              <dd className="text-2xl font-medium tabular-nums">
                {reviewsFiled} / {lineup.length}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-ink-soft">Films watched</dt>
              <dd className="text-2xl font-medium tabular-nums">
                {watched.size} / {lineup.length}
              </dd>
            </div>
            {isCurator && (
              <div className="flex items-baseline justify-between gap-4 border-t border-rule pt-4">
                <dt className="text-sm text-ink-soft">Festival awards</dt>
                <dd className="text-2xl font-medium tabular-nums">
                  {festivalAwards}
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            Upvotes decide {VOICE_OF_THE_PEOPLE}. Everyone competes for it,
            curators included.
          </p>
        </section>

        {leaderboard.length > 0 && (
          <section className="border border-rule bg-paper-raised px-5 py-5">
            <h2 className="label-eyebrow border-b border-rule pb-2">
              Best Critic — the board
            </h2>
            <ol className="mt-4 grid gap-2.5">
              {leaderboard.map((row, i) => (
                <li
                  key={`${row.name}-${i}`}
                  className="flex items-baseline gap-3"
                >
                  <span className="w-5 shrink-0 text-sm tabular-nums text-ink-faint">
                    {i + 1}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${row.me ? "font-medium text-signal" : ""}`}
                  >
                    {row.name}
                    {row.me && " (you)"}
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {row.points}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
              Updates Wednesdays as each film&apos;s votes are revealed.
              Insightful and Funniest both score one point.
            </p>
          </section>
        )}

        {next && current && (
          <section className="border border-rule bg-paper-raised px-5 py-5">
            <h2 className="label-eyebrow border-b border-rule pb-2">
              Coming next
            </h2>
            <Link
              href={`/guild/${guildId}/film/${next.film.id}`}
              className="mt-4 block text-lg font-medium uppercase leading-tight tracking-tight transition-colors hover:text-signal"
            >
              {next.film.title}
            </Link>
            <p className="mt-1 text-xs text-ink-faint">
              Film {next.position} of {lineup.length}
            </p>
            <div className="mt-4">
              <p className="label-eyebrow">Opens in</p>
              <div className="mt-1.5">
                <Countdown
                  deadline={next.viewingStartsAt}
                  expiredLabel="Open now"
                  size="small"
                />
              </div>
            </div>
          </section>
        )}

        <section className="border border-rule bg-paper-raised px-5 py-5">
          <h2 className="label-eyebrow border-b border-rule pb-2">
            {theme}
          </h2>
          <Link
            href={`/guild/${guildId}`}
            className="mt-4 inline-block text-sm underline hover:text-signal"
          >
            Guild home
          </Link>
        </section>
      </aside>
    </div>
  );
}

/** What the clock is counting down to, in the member's terms. */
const DEADLINE_LABEL: Record<ScreeningPhase, string> = {
  UPCOMING: "Opens in",
  // Watching and writing share one window, closing Sunday midnight Pacific.
  VIEWING: "Watch and review within",
  REVIEWING: "Review it within",
  CRITICS_VOTING: "Vote within",
  CLOSED: "Closed",
};

/**
 * Two clicks to flag — the first arms it, the second sends. No dialog, so it
 * works the same in the browser and the iOS webview.
 */
function ReportButton({
  reported,
  onReport,
}: {
  reported: boolean;
  onReport: () => void;
}) {
  const [armed, setArmed] = useState(false);

  if (reported) {
    return (
      <span className="text-xs uppercase tracking-[0.1em] text-ink-faint">
        Reported
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onReport();
      }}
      onBlur={() => setArmed(false)}
      aria-label="Report this review to the president"
      className={`border px-3 py-2 text-xs uppercase tracking-[0.1em] transition-colors ${
        armed
          ? "border-signal text-signal"
          : "border-rule text-ink-faint hover:border-ink hover:text-ink"
      }`}
    >
      {armed ? "Confirm" : "Report"}
    </button>
  );
}

/**
 * One vote type on one review: tap the label to spend a vote (stacking is
 * allowed), tap the count to take one back. Counts show YOUR allocation —
 * totals stay sealed until the Wednesday reveal.
 */
function AllocateControl({
  label,
  count,
  canAdd,
  onAdd,
  onRemove,
}: {
  label: string;
  count: number;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <span
      className={`inline-flex items-stretch border text-xs font-medium uppercase tracking-[0.1em] ${
        count > 0 ? "border-signal" : "border-rule"
      }`}
    >
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className={`px-3 py-2 transition-colors disabled:opacity-30 ${
          count > 0
            ? "bg-signal text-paper hover:bg-signal-dark"
            : "hover:border-ink hover:text-ink"
        }`}
      >
        {label}
        {count > 0 && <span className="ml-1.5 tabular-nums">×{count}</span>}
      </button>
      {count > 0 && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Take back one ${label} upvote`}
          className="border-l border-signal px-2 text-signal transition-colors hover:bg-signal hover:text-paper"
        >
          −
        </button>
      )}
    </span>
  );
}
