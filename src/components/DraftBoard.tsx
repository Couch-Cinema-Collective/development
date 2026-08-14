"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import { FilmPoster } from "./FilmPoster";
import { buildPool } from "@/lib/slate";
import { POINTS_PER_MEMBER, type Film, type Nomination, type Season } from "@/lib/types";

interface DraftBoardProps {
  season: Season;
  /** Category catalog shown before the member searches for anything. */
  catalog: Film[];
  /** Everyone else's stakes. The current member's are collected here. */
  existingNominations: Nomination[];
  currentMemberId: string;
  /** False when running on fixtures rather than live TMDB. */
  live: boolean;
}

export function DraftBoard({
  season,
  catalog,
  existingNominations,
  currentMemberId,
  live,
}: DraftBoardProps) {
  const [allocations, setAllocations] = useState<Record<number, number>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Film[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [draggingChip, setDraggingChip] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  /** Grows as live search introduces films outside the fixture catalog. */
  const [knownFilms, setKnownFilms] = useState<Map<number, Film>>(
    () => new Map(catalog.map((f) => [f.id, f])),
  );

  const spent = Object.values(allocations).reduce((sum, n) => sum + n, 0);
  const unspent = POINTS_PER_MEMBER - spent;

  const allocate = useCallback(
    (filmId: number, delta: number) => {
      if (submitted) return;
      setAllocations((prev) => {
        const current = prev[filmId] ?? 0;
        const next = current + delta;
        if (next < 0) return prev;

        const total = Object.values(prev).reduce((s, n) => s + n, 0) - current + next;
        if (total > POINTS_PER_MEMBER) return prev;

        const updated = { ...prev, [filmId]: next };
        if (next === 0) delete updated[filmId];
        return updated;
      });
    },
    [submitted],
  );

  // Debounced search against the proxied TMDB route.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/films/search?q=${encodeURIComponent(q)}`);
        const data: { films: Film[] } = await res.json();
        setResults(data.films);
        setKnownFilms((prev) => {
          const next = new Map(prev);
          for (const film of data.films) next.set(film.id, film);
          return next;
        });
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const myNominations = useMemo<Nomination[]>(
    () =>
      Object.entries(allocations).map(([filmId, points]) => ({
        filmId: Number(filmId),
        memberId: currentMemberId,
        points,
      })),
    [allocations, currentMemberId],
  );

  const pool = useMemo(
    () => buildPool([...existingNominations, ...myNominations], knownFilms, season.weights),
    [existingNominations, myNominations, knownFilms, season.weights],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    setDraggingChip(null);
    const filmId = event.over?.id;
    if (typeof filmId === "number") allocate(filmId, 1);
  }

  const displayed = results ?? catalog;

  return (
    <DndContext
      // Stable id — without it dnd-kit derives aria ids from a render counter
      // that differs between server and client, tripping hydration.
      id="draft-board"
      sensors={sensors}
      onDragStart={(e) => setDraggingChip(String(e.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingChip(null)}
    >
      <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
        <section>
          <ChipTray unspent={unspent} spent={spent} submitted={submitted} />

          <div className="mt-8">
            <label className="label-eyebrow block" htmlFor="film-search">
              Search the catalog
            </label>
            <input
              id="film-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title or director…"
              className="mt-3 w-full border-b border-ink bg-transparent pb-3 text-2xl tracking-tight outline-none placeholder:text-ink-faint focus:border-signal"
            />
            <p className="mt-2 text-xs text-ink-faint">
              {searching
                ? "Searching…"
                : live
                  ? "Live results from TMDB."
                  : `Showing the ${season.category} fixture catalog — add a TMDB key for live search.`}
            </p>
          </div>

          {displayed.length === 0 && !searching ? (
            <p className="mt-16 text-sm text-ink-soft">
              No films matched “{query}”.
            </p>
          ) : (
            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
              {displayed.map((film) => (
                <FilmCard
                  key={film.id}
                  film={film}
                  allocated={allocations[film.id] ?? 0}
                  canAdd={unspent > 0 && !submitted}
                  onAllocate={allocate}
                />
              ))}
            </ul>
          )}
        </section>

        <Pool
          pool={pool}
          currentMemberId={currentMemberId}
          filmCount={season.filmCount}
          spent={spent}
          submitted={submitted}
          onSubmit={() => setSubmitted(true)}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {draggingChip ? (
          <span className="block size-9 rounded-full bg-signal shadow-lg" />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ------------------------------------------------------------------ */

function ChipTray({
  unspent,
  spent,
  submitted,
}: {
  unspent: number;
  spent: number;
  submitted: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-6 border border-ink bg-paper-raised px-6 py-5">
      <div>
        <p className="label-eyebrow">Your nomination points</p>
        <p className="mt-1 text-sm text-ink-soft">
          {submitted
            ? "Locked in."
            : unspent === 0
              ? "All five spent. Drag a chip off a film to rethink."
              : "Drag a chip onto a film, or use the + on any card."}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {Array.from({ length: POINTS_PER_MEMBER }).map((_, i) =>
          i < unspent ? (
            <DraggableChip key={`free-${i}`} id={`chip-${i}`} />
          ) : (
            <span
              key={`spent-${i}`}
              className="size-9 rounded-full border border-dashed border-ink-faint"
              aria-label="Spent point"
            />
          ),
        )}
        <span className="ml-2 tabular-nums text-sm text-ink-faint">
          {spent}/{POINTS_PER_MEMBER}
        </span>
      </div>
    </div>
  );
}

function DraggableChip({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label="Unspent nomination point"
      className={`size-9 cursor-grab touch-none rounded-full bg-signal transition-opacity active:cursor-grabbing ${
        isDragging ? "opacity-25" : ""
      }`}
    />
  );
}

function FilmCard({
  film,
  allocated,
  canAdd,
  onAllocate,
}: {
  film: Film;
  allocated: number;
  canAdd: boolean;
  onAllocate: (filmId: number, delta: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: film.id });

  return (
    <li ref={setNodeRef} className="group">
      <div
        className={`relative transition-transform ${isOver ? "scale-[1.03]" : ""}`}
      >
        <FilmPoster film={film} />

        {allocated > 0 && (
          <span className="absolute -right-2 -top-2 flex items-center gap-1 bg-signal px-2.5 py-1.5">
            {Array.from({ length: allocated }).map((_, i) => (
              <span key={i} className="size-2 rounded-full bg-paper" />
            ))}
          </span>
        )}

        {isOver && <span className="absolute inset-0 border-2 border-signal" />}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-tight">{film.title}</p>
          <p className="truncate text-xs text-ink-faint">
            {film.director}
            {film.runtime ? ` · ${film.runtime}m` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onAllocate(film.id, -1)}
            disabled={allocated === 0}
            aria-label={`Remove a point from ${film.title}`}
            className="size-7 border border-rule text-sm leading-none transition-colors hover:border-ink disabled:opacity-30 disabled:hover:border-rule"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onAllocate(film.id, 1)}
            disabled={!canAdd}
            aria-label={`Add a point to ${film.title}`}
            className="size-7 border border-ink bg-ink text-sm leading-none text-paper transition-colors hover:bg-signal hover:border-signal disabled:opacity-25"
          >
            +
          </button>
        </div>
      </div>
    </li>
  );
}

function Pool({
  pool,
  currentMemberId,
  filmCount,
  spent,
  submitted,
  onSubmit,
}: {
  pool: ReturnType<typeof buildPool>;
  currentMemberId: string;
  filmCount: number;
  spent: number;
  submitted: boolean;
  onSubmit: () => void;
}) {
  return (
    <aside className="lg:sticky lg:top-8 lg:self-start">
      <h2 className="label-eyebrow">The pool</h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-faint">
        Totals are live. Who nominated what stays hidden until the slate locks.
      </p>

      <ol className="mt-6 space-y-0 border-t border-rule">
        {pool.map((entry, index) => {
          const mine = entry.nominatorIds.includes(currentMemberId);
          const onSlate = index < filmCount;

          return (
            <li
              key={entry.film.id}
              className={`flex items-baseline gap-3 border-b border-rule py-3 ${
                onSlate ? "" : "opacity-45"
              }`}
            >
              <span className="w-4 shrink-0 tabular-nums text-xs text-ink-faint">
                {index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm tracking-tight">
                  {entry.film.title}
                  {mine && <span className="ml-1.5 text-signal">●</span>}
                </span>
                <span className="text-xs text-ink-faint">
                  {entry.nominatorIds.length} nominator
                  {entry.nominatorIds.length === 1 ? "" : "s"}
                </span>
              </span>

              <span className="shrink-0 tabular-nums text-sm font-medium">
                {entry.points}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs text-ink-faint">
        Top {filmCount} make the slate. A tie at the cut expands it.
      </p>

      <button
        type="button"
        onClick={onSubmit}
        disabled={spent === 0 || submitted}
        className="mt-8 w-full bg-ink px-5 py-4 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-signal disabled:opacity-30 disabled:hover:bg-ink"
      >
        {submitted ? "Nominations submitted" : "Lock in nominations"}
      </button>

      {!submitted && spent > 0 && spent < POINTS_PER_MEMBER && (
        <p className="mt-3 text-center text-xs text-ink-faint">
          You still have {POINTS_PER_MEMBER - spent} unspent.
        </p>
      )}
    </aside>
  );
}
