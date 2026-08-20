"use client";

import { useState, useTransition } from "react";

import { setCuratorSeats } from "@/app/guild/[id]/actions";
import { MAX_CURATORS, MIN_CURATORS } from "@/lib/types";

/**
 * How many curator seats the guild has.
 *
 * Seats are first-come-first-served, so this number is the president's whole
 * say over the curator roster: it sets how many people can put a film up, and
 * therefore how long the festival runs. Seats already filled are the floor —
 * the control won't offer a number below them, and Postgres refuses it too.
 */
export function CuratorSeats({
  guildId,
  seats,
  filled,
}: {
  guildId: string;
  seats: number;
  filled: number;
}) {
  const [value, setValue] = useState(seats);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const floor = Math.max(MIN_CURATORS, filled);
  const options = Array.from(
    { length: MAX_CURATORS - floor + 1 },
    (_, i) => floor + i,
  );

  function choose(next: number) {
    const previous = value;
    setValue(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setCuratorSeats(guildId, next);
      if (result.error) {
        setError(result.error);
        setValue(previous);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <section className="border border-rule bg-paper-raised p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="label-eyebrow">Curator seats</h2>
        <p className="label-eyebrow">
          {filled} filled
          {saved && <span className="ml-3 text-signal">Saved</span>}
        </p>
      </div>

      <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
        Anyone with the invite link can take a free seat — no approval, first
        come first served. How many exist is up to you, and it decides how many
        films the festival runs.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => choose(n)}
            disabled={pending || n === value}
            className={`min-w-11 border px-3.5 py-2.5 text-sm font-medium tabular-nums transition-colors disabled:cursor-default ${
              n === value
                ? "border-ink bg-ink text-paper"
                : "border-rule hover:border-ink"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-faint">
        {value - filled > 0
          ? `${value - filled} seat${value - filled === 1 ? "" : "s"} still open.`
          : "Every seat is taken — raise the number to let more curators in."}
        {filled > MIN_CURATORS &&
          ` You can't go below ${filled} without removing a curator first.`}
      </p>

      {error && <p className="mt-3 text-sm text-signal">{error}</p>}
    </section>
  );
}
