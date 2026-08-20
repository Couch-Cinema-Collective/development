"use client";

import { useActionState, useState } from "react";

import {
  createGuild,
  joinGuild,
  type GuildFormState,
} from "@/app/welcome/actions";

export function CreateGuildForm() {
  const [state, action, pending] = useActionState<GuildFormState, FormData>(
    createGuild,
    null,
  );

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-2">
        <span className="label-eyebrow">Guild name</span>
        <input
          name="name"
          required
          maxLength={80}
          placeholder="The Sunday Couch"
          className="border-b border-ink bg-transparent pb-2 outline-none placeholder:text-ink-faint focus:border-signal"
        />
      </label>
      {state?.error && <p className="text-sm text-signal">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="justify-self-start border border-ink px-5 py-2.5 text-sm uppercase tracking-[0.1em] transition-colors hover:bg-ink hover:text-paper disabled:opacity-30"
      >
        {pending ? "Establishing…" : "Establish the Guild"}
      </button>
    </form>
  );
}

/**
 * The onboarding fork, in the words the founding notes use: critic or curator?
 *
 * Both chairs are open on arrival — nobody approves anybody. Curator seats are
 * simply finite, so the only way to miss out is to be too late, which is what
 * `curatorSeatsLeft` warns about before the choice is made rather than after
 * it is submitted.
 */
export function JoinGuildForm({
  code = "",
  curatorSeatsLeft,
}: {
  code?: string;
  /** Undefined where the count isn't known (the generic welcome-page form). */
  curatorSeatsLeft?: number;
}) {
  const [state, action, pending] = useActionState<GuildFormState, FormData>(
    joinGuild,
    null,
  );
  const [role, setRole] = useState<"critic" | "curator">("critic");

  const curatorFull = curatorSeatsLeft !== undefined && curatorSeatsLeft <= 0;

  const options = [
    {
      id: "critic" as const,
      label: "Critic",
      note: "Watch, review, vote. Always open.",
      disabled: false,
    },
    {
      id: "curator" as const,
      label: "Curator",
      note: curatorFull
        ? "Every seat is taken."
        : curatorSeatsLeft !== undefined
          ? `Also put a film up. ${curatorSeatsLeft} seat${curatorSeatsLeft === 1 ? "" : "s"} left.`
          : "Also put a film up, if a seat is free.",
      disabled: curatorFull,
    },
  ];

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="role" value={role} />

      <fieldset className="grid gap-2">
        <legend className="label-eyebrow">Which chair?</legend>
        <div className="mt-1 grid gap-px border border-rule bg-rule sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setRole(o.id)}
              aria-pressed={role === o.id}
              disabled={o.disabled}
              className={`px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                role === o.id
                  ? "bg-ink text-paper"
                  : "bg-paper-raised hover:bg-paper"
              }`}
            >
              <span className="block text-sm font-medium uppercase tracking-tight">
                {o.label}
              </span>
              <span
                className={`mt-0.5 block text-xs ${
                  role === o.id ? "text-paper/60" : "text-ink-faint"
                }`}
              >
                {o.note}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {code ? (
        <input type="hidden" name="code" value={code} />
      ) : (
        <label className="grid gap-2">
          <span className="label-eyebrow">Invite code</span>
          <input
            name="code"
            required
            placeholder="e.g. 3f9a1c2b7d"
            className="border-b border-ink bg-transparent pb-2 outline-none placeholder:text-ink-faint focus:border-signal"
          />
        </label>
      )}
      {state?.error && <p className="text-sm text-signal">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="justify-self-start border border-ink px-5 py-2.5 text-sm uppercase tracking-[0.1em] transition-colors hover:bg-ink hover:text-paper disabled:opacity-30"
      >
        {pending
          ? "Joining…"
          : role === "curator"
            ? "Take a Curator Seat"
            : "Join as Critic"}
      </button>
    </form>
  );
}
