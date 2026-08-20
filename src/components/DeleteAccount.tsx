"use client";

import { useState, useTransition } from "react";

import { deleteAccount } from "@/app/profile/actions";

/**
 * In-app account deletion (App Store guideline 5.1.1(v)).
 *
 * Two-step and type-to-confirm, because this is genuinely irreversible and a
 * mis-tap shouldn't cost someone three festivals of history.
 */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmed = typed.trim().toUpperCase() === "DELETE";

  return (
    <section className="mt-16 border border-paper/25 bg-ink/40 p-6 backdrop-blur">
      <h2 className="label-eyebrow text-paper/60">Danger zone</h2>

      {!open ? (
        <>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-paper/70">
            Deleting your account removes your nominations, reviews, ratings,
            upvotes, ballots, and guild memberships. It cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 border border-paper/50 px-5 py-2.5 text-xs uppercase tracking-[0.12em] text-paper transition-colors hover:bg-paper hover:text-ink"
          >
            Delete account
          </button>
        </>
      ) : (
        <>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-paper/70">
            This is permanent. If you run a guild, it passes to your
            longest-standing member — or is deleted if you were the only one
            left. Type <strong className="text-paper">DELETE</strong> to confirm.
          </p>

          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="Type DELETE to confirm"
            className="mt-4 w-48 border-b border-paper/40 bg-transparent pb-2 font-mono text-sm uppercase text-paper outline-none focus:border-paper"
          />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!confirmed || pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await deleteAccount();
                  if (result?.error) setError(result.error);
                });
              }}
              className="bg-ink px-5 py-2.5 text-xs uppercase tracking-[0.12em] text-paper transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              {pending ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
              className="text-xs uppercase tracking-[0.12em] text-paper/60 transition-colors hover:text-paper"
            >
              Cancel
            </button>
          </div>

          {error && <p className="mt-4 text-sm text-paper">{error}</p>}
        </>
      )}
    </section>
  );
}
