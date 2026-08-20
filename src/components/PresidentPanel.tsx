"use client";

import { useState, useTransition } from "react";

import {
  archiveFestival,
  openAwardsVoting,
  openNominations,
  publishFestival,
  setLineup,
  startScreening,
  type FestivalActionResult,
} from "@/app/guild/[id]/actions";

/**
 * The president's single next move.
 *
 * Running a festival is a sequence, not a control panel, so this shows exactly
 * one button: whatever the festival is waiting on. Everything the president
 * could do later is not shown until it is the thing to do — which is the whole
 * simplification. The states with no button are the ones where the clock is
 * doing the work and the right action is to leave it alone.
 */
interface Step {
  /** What the festival is waiting for, in one line. */
  status: string;
  /** The single button, when there is one to press. */
  label?: string;
  confirm?: string;
  run?: (festivalId: string) => Promise<FestivalActionResult>;
  /** Shown under the button — the consequence, stated plainly. */
  note?: string;
}

const STEPS: Record<string, Step> = {
  DRAFT: {
    status: "Set up, not yet open",
    label: "Open nominations",
    note: "Curators get a week to put a film up. Critics can join throughout.",
    run: (id) => openNominations(id),
  },
  RECRUITING: {
    status: "Recruiting curators",
    label: "Open nominations",
    note: "Anyone who joins after this still gets to watch and vote.",
    run: (id) => openNominations(id),
  },
  NOMINATING: {
    status: "Curators are choosing their films",
    label: "Draw the lineup",
    confirm:
      "Draw the lineup now? Nominations close and screening order is drawn at random. Only films curators have LOCKED IN are included — anyone who picked without locking is left out. This cannot be undone.",
    note: "Locked submissions only. Nothing starts until you open it.",
    run: setLineup,
  },
  LINEUP_SET: {
    status: "Lineup drawn — nothing is screening yet",
    label: "Open the festival",
    confirm:
      "Open the festival? The first film opens immediately and every window is scheduled from this moment.",
    note: "Film one opens the instant you press this — no waiting.",
    run: startScreening,
  },
  SCREENING: {
    status: "Screening — one film at a time",
    label: "Open the awards ballot",
    note: "Only available once the last film's voting window has shut.",
    run: openAwardsVoting,
  },
  AWARDS_VOTING: {
    status: "The guild is voting on the awards",
    label: "Publish the ceremony",
    confirm:
      "Publish? Winners are computed from the ballots as they stand and cannot be altered afterward.",
    note: "You see the results at the same moment everyone else does.",
    run: publishFestival,
  },
  CEREMONY: {
    status: "Ceremony published",
    label: "Close the festival",
    note: "Archives it and clears the way for the next one.",
    run: archiveFestival,
  },
  ARCHIVED: { status: "Archived" },
};

export function PresidentPanel({
  festivalId,
  state,
  /** Nomination deadline, for the early-close warning. */
  deadline,
  /**
   * The lineup is drawn but not one film has actually started. A festival can
   * reach SCREENING without screening anything, so the state column alone is
   * not enough to know what to offer.
   */
  awaitingOpen = false,
}: {
  festivalId: string;
  state: string;
  deadline: string | null;
  awaitingOpen?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Offer the Open button whenever nothing has begun, whatever the state says.
  const step = awaitingOpen ? STEPS.LINEUP_SET : STEPS[state];
  if (!step) return null;

  const beforeDeadline =
    state === "NOMINATING" && deadline && new Date(deadline) > new Date();

  function activate() {
    if (!step.run) return;
    if (step.confirm && !window.confirm(step.confirm)) return;
    setError(null);
    startTransition(async () => {
      const result = await step.run!(festivalId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="border border-ink bg-paper-raised p-6">
      <p className="label-eyebrow text-signal">Your move</p>
      <p className="mt-2 text-2xl font-medium uppercase leading-tight tracking-tight">
        {step.status}
      </p>

      {step.label && (
        <div className="mt-5">
          <button
            type="button"
            onClick={activate}
            disabled={pending}
            className="bg-signal px-7 py-3.5 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink disabled:opacity-40"
          >
            {pending ? "Working…" : step.label}
          </button>
          {step.note && (
            <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-faint">
              {step.note}
            </p>
          )}
          {beforeDeadline && (
            <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-faint">
              The countdown hasn&apos;t run out — setting the lineup now ends
              nominations early.
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-signal">{error}</p>}
    </div>
  );
}
