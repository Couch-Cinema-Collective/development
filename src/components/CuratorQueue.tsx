"use client";

import { useState, useTransition } from "react";

import { approveCurator, declineCurator } from "@/app/guild/[id]/actions";
import type { RosterEntry } from "@/lib/guilds";

/**
 * Curator applications waiting on the president.
 *
 * Declining is not a rejection from the guild — the applicant stays on as a
 * critic, which is why the button says "Seat as critic" rather than "Decline".
 * A curator seat is one of twelve; a critic seat is one of fifty.
 */
export function CuratorQueue({
  guildId,
  pending: applications,
  seatsLeft,
}: {
  guildId: string;
  pending: RosterEntry[];
  seatsLeft: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  if (applications.length === 0) return null;

  function act(userId: string, approve: boolean) {
    setError(null);
    startTransition(async () => {
      const result = approve
        ? await approveCurator(guildId, userId)
        : await declineCurator(guildId, userId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <section className="border border-signal bg-paper-raised p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="label-eyebrow text-signal">
          Curator applications · {applications.length}
        </h2>
        <p className="label-eyebrow">
          {seatsLeft} seat{seatsLeft === 1 ? "" : "s"} left
        </p>
      </div>

      <ul className="mt-4 grid gap-px border border-rule bg-rule">
        {applications.map((a) => (
          <li
            key={a.userId}
            className="flex flex-wrap items-center justify-between gap-4 bg-paper px-4 py-3"
          >
            <span className="text-sm font-medium">{a.fullName}</span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => act(a.userId, true)}
                disabled={busy || seatsLeft <= 0}
                className="bg-signal px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink disabled:opacity-40"
              >
                Seat as curator
              </button>
              <button
                type="button"
                onClick={() => act(a.userId, false)}
                disabled={busy}
                className="border border-rule px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors hover:border-ink disabled:opacity-40"
              >
                Seat as critic
              </button>
            </span>
          </li>
        ))}
      </ul>

      {seatsLeft <= 0 && (
        <p className="mt-3 text-xs text-ink-faint">
          Every curator seat is taken. Free one up before approving another.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-signal">{error}</p>}
    </section>
  );
}
