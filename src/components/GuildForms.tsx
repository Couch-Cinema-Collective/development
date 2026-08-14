"use client";

import { useActionState } from "react";

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
        {pending ? "Founding…" : "Found the Guild"}
      </button>
    </form>
  );
}

export function JoinGuildForm({ code = "" }: { code?: string }) {
  const [state, action, pending] = useActionState<GuildFormState, FormData>(
    joinGuild,
    null,
  );

  return (
    <form action={action} className="grid gap-4">
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
        {pending ? "Joining…" : "Join the Guild"}
      </button>
    </form>
  );
}
