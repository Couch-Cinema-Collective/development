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
 * Critics are admitted immediately — there is no reason to gatekeep the voting
 * body. A curator seat is one of twelve and comes out of someone else's, so
 * that choice goes to the president as an application.
 */
export function JoinGuildForm({ code = "" }: { code?: string }) {
  const [state, action, pending] = useActionState<GuildFormState, FormData>(
    joinGuild,
    null,
  );
  const [role, setRole] = useState<"critic" | "curator">("critic");

  const options = [
    {
      id: "critic" as const,
      label: "Critic",
      note: "Watch, review, vote. In straight away.",
    },
    {
      id: "curator" as const,
      label: "Curator",
      note: "Also put a film up. Needs the president's nod.",
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
              className={`px-4 py-3 text-left transition-colors ${
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
            ? "Apply as Curator"
            : "Join as Critic"}
      </button>
    </form>
  );
}
