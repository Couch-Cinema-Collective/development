"use client";

import { useState, useTransition } from "react";

import {
  saveActingNominees,
  seedActingNominees,
} from "@/app/guild/[id]/award-actions";
import type { ActingNominee } from "@/lib/types";

export interface ActingAwardRow {
  awardId: string;
  name: string;
  nominees: ActingNominee[];
}

/**
 * The president's slate editor for acting categories: one nominee per lineup
 * film, seeded from billing order, corrected here when the internet consensus
 * says otherwise. Critics vote among exactly these names.
 */
export function ActingNominees({
  guildId,
  festivalId,
  awards,
  films,
}: {
  guildId: string;
  festivalId: string;
  awards: ActingAwardRow[];
  films: { tmdbId: number; title: string }[];
}) {
  const [rows, setRows] = useState(awards);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (rows.length === 0) return null;
  const unseeded = rows.some((a) => a.nominees.length === 0);

  function nomineeFor(award: ActingAwardRow, tmdbId: number): string {
    return award.nominees.find((n) => n.tmdbId === tmdbId)?.name ?? "";
  }

  function edit(awardId: string, tmdbId: number, name: string) {
    setRows((prev) =>
      prev.map((a) => {
        if (a.awardId !== awardId) return a;
        const rest = a.nominees.filter((n) => n.tmdbId !== tmdbId);
        const kept = a.nominees.find((n) => n.tmdbId === tmdbId);
        return {
          ...a,
          nominees: [...rest, { tmdbId, name, personId: kept?.personId }],
        };
      }),
    );
  }

  function save(award: ActingAwardRow) {
    setError(null);
    startTransition(async () => {
      const result = await saveActingNominees(
        guildId,
        festivalId,
        award.awardId,
        award.nominees,
      );
      if (result.error) setError(result.error);
      else {
        setSavedId(award.awardId);
        setTimeout(() => setSavedId(null), 2000);
      }
    });
  }

  function seed() {
    setError(null);
    startTransition(async () => {
      const result = await seedActingNominees(festivalId);
      if (result.error) setError(result.error);
      // Server data changed shape — simplest honest refresh.
      else window.location.reload();
    });
  }

  return (
    <section className="border border-rule bg-paper-raised p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="label-eyebrow">Acting nominees</h2>
        {unseeded && (
          <button
            type="button"
            onClick={seed}
            disabled={pending}
            className="border border-rule px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition-colors hover:border-ink disabled:opacity-50"
          >
            {pending ? "Seeding…" : "Seed from top billing"}
          </button>
        )}
      </div>
      <p className="mt-2 max-w-lg text-xs leading-relaxed text-ink-faint">
        One performer per film, by consensus — the ballot offers exactly these
        names. Edit freely; critics see changes immediately.
      </p>

      {error && <p className="mt-3 text-xs text-signal">{error}</p>}

      <div className="mt-5 space-y-7">
        {rows.map((award) => (
          <div key={award.awardId}>
            <h3 className="border-b border-rule pb-1.5 text-sm font-medium uppercase tracking-tight">
              {award.name}
            </h3>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {films.map((film) => (
                <label key={film.tmdbId} className="block">
                  <span className="block truncate text-xs text-ink-faint">
                    {film.title}
                  </span>
                  <input
                    type="text"
                    value={nomineeFor(award, film.tmdbId)}
                    onChange={(e) =>
                      edit(award.awardId, film.tmdbId, e.target.value)
                    }
                    placeholder="Performer name"
                    className="mt-1 w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-signal"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => save(rows.find((a) => a.awardId === award.awardId)!)}
              disabled={pending}
              className="mt-3 border border-rule px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors hover:border-ink disabled:opacity-50"
            >
              {savedId === award.awardId ? "Saved ✓" : "Save nominees"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
