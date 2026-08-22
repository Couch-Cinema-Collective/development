"use client";

import { useState } from "react";

import {
  removeMember,
  setMemberBlocked,
} from "@/app/guild/[id]/moderation-actions";
import type { GuildRole } from "@/lib/types";

/**
 * The per-member controls on the guild roster: any member can block another
 * (hides their revealed reviews from you alone); the president can remove a
 * member from the guild. Remove takes two clicks — the first arms it.
 */
export function RosterActions({
  guildId,
  userId,
  role,
  isSelf,
  presidentView,
  initiallyBlocked,
}: {
  guildId: string;
  userId: string;
  role: GuildRole;
  isSelf: boolean;
  presidentView: boolean;
  initiallyBlocked: boolean;
}) {
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [removeArmed, setRemoveArmed] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isSelf) return null;
  if (removed) {
    return (
      <span className="text-xs uppercase tracking-[0.1em] text-ink-faint">
        Removed
      </span>
    );
  }

  const toggleBlock = async () => {
    const next = !blocked;
    setBlocked(next);
    setError(null);
    const result = await setMemberBlocked(guildId, userId, next);
    if (result.error) {
      setBlocked(!next);
      setError(result.error);
    }
  };

  const remove = async () => {
    if (!removeArmed) {
      setRemoveArmed(true);
      return;
    }
    setRemoveArmed(false);
    setError(null);
    const result = await removeMember(guildId, userId);
    if (result.error) setError(result.error);
    else setRemoved(true);
  };

  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-signal">{error}</span>}
      <button
        type="button"
        onClick={toggleBlock}
        aria-pressed={blocked}
        className={`border px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition-colors ${
          blocked
            ? "border-ink bg-ink text-paper"
            : "border-rule text-ink-faint hover:border-ink hover:text-ink"
        }`}
      >
        {blocked ? "Blocked" : "Block"}
      </button>
      {presidentView && role !== "president" && (
        <button
          type="button"
          onClick={remove}
          onBlur={() => setRemoveArmed(false)}
          className={`border px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition-colors ${
            removeArmed
              ? "border-signal text-signal"
              : "border-rule text-ink-faint hover:border-ink hover:text-ink"
          }`}
        >
          {removeArmed ? "Confirm remove" : "Remove"}
        </button>
      )}
    </span>
  );
}
