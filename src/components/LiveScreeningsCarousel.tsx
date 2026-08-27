"use client";

import Link from "next/link";

import { Countdown } from "./Countdown";
import { FilmPoster } from "./FilmPoster";
import { PHASE_LABELS } from "@/lib/lineup";
import type { LiveScreening } from "@/lib/liveScreenings";

/**
 * What's on right now, across every guild — one card per guild with
 * something currently open. Each card is a straight shot to the dashboard
 * where the actual watching, reviewing, or voting happens.
 */
export function LiveScreeningsCarousel({ items }: { items: LiveScreening[] }) {
  return (
    <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2">
      {items.map((item) => (
        <Link
          key={item.guildId}
          href={`/dashboard?guild=${item.guildId}`}
          className="group flex w-64 shrink-0 snap-start flex-col border border-ink bg-paper-raised transition-colors hover:border-signal"
        >
          <FilmPoster film={item.film} className="w-full" />
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div>
              <p className="label-eyebrow text-signal">
                {PHASE_LABELS[item.phase]}
              </p>
              <p className="mt-1 truncate text-xs text-ink-faint">
                {item.guildName} · Festival {item.festivalNumber}
              </p>
            </div>

            <h3 className="text-balance text-lg font-medium uppercase leading-[1.05] tracking-tight transition-colors group-hover:text-signal">
              {item.film.title}
            </h3>

            <div className="mt-auto">
              <Countdown deadline={item.deadline} size="small" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
