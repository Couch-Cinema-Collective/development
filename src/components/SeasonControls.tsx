"use client";

import { useState, useTransition } from "react";

import {
  advanceSeason,
  lockSlate,
  publishSeason,
  type SeasonActionResult,
} from "@/app/guild/[id]/actions";

interface Control {
  label: string;
  confirm?: string;
  run: (seasonId: string) => Promise<SeasonActionResult>;
}

/** The one commissioner-facing transition per state (PLAN.md §2). */
const CONTROLS: Record<string, Control> = {
  NOMINATING: {
    label: "Lock the slate",
    confirm:
      "Lock nominations now? The slate is cut, nominators are revealed, and no more points can be placed.",
    run: lockSlate,
  },
  SLATE_LOCKED: { label: "Start the watching phase", run: advanceSeason },
  WATCHING: {
    label: "Open voting",
    confirm: "Open voting? Members can no longer mark films watched to qualify.",
    run: advanceSeason,
  },
  VOTING: {
    label: "Publish the ceremony",
    confirm:
      "Publish? Winners are computed from the ballots as they stand and cannot be altered afterward.",
    run: publishSeason,
  },
  PUBLISHED: { label: "Archive season", run: advanceSeason },
};

export function SeasonControls({
  seasonId,
  state,
  deadline,
}: {
  seasonId: string;
  state: string;
  /** Nomination deadline, for the early-lock warning. */
  deadline: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const control = CONTROLS[state];
  if (!control) return null;

  const beforeDeadline =
    state === "NOMINATING" && deadline && new Date(deadline) > new Date();

  function activate() {
    if (control.confirm && !window.confirm(control.confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await control.run(seasonId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mt-5 border-t border-rule pt-5">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={activate}
          disabled={pending}
          className="bg-ink px-6 py-3 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-signal disabled:opacity-30"
        >
          {pending ? "Working…" : control.label}
        </button>
        {beforeDeadline && (
          <p className="text-xs leading-relaxed text-ink-faint">
            The countdown hasn&apos;t run out — locking now ends nominations
            early.
          </p>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-signal">{error}</p>}
    </div>
  );
}
