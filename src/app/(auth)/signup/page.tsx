"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";

import { signup, type AuthFormState } from "../actions";
import { OAuthButtons } from "@/components/OAuthButtons";

function SignupForm() {
  const searchParams = useSearchParams();
  // Carries an invite destination (/join/<code>) through the signup flow.
  const next = searchParams.get("next") ?? "/welcome";
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signup,
    null,
  );

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">Members</p>
        <h1 className="mt-3 text-4xl font-medium uppercase leading-none tracking-tight">
          Join the Collective
        </h1>
      </header>

      <div className="mt-10">
        <OAuthButtons next={next} />
      </div>

      <p className="label-eyebrow mt-10 border-b border-rule pb-2">
        Or with email
      </p>

      {state?.notice ? (
        <p className="mt-6 border border-rule bg-paper-raised p-4 text-sm leading-relaxed">
          {state.notice}
        </p>
      ) : (
        <form action={action} className="mt-6 grid gap-6">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-2">
            <span className="label-eyebrow">Name</span>
            <input
              name="name"
              required
              autoComplete="name"
              className="border-b border-ink bg-transparent pb-2 outline-none placeholder:text-ink-faint focus:border-signal"
            />
          </label>

          <label className="grid gap-2">
            <span className="label-eyebrow">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="border-b border-ink bg-transparent pb-2 outline-none placeholder:text-ink-faint focus:border-signal"
            />
          </label>

          <label className="grid gap-2">
            <span className="label-eyebrow">Phone</span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Optional"
              className="border-b border-ink bg-transparent pb-2 outline-none placeholder:text-ink-faint focus:border-signal"
            />
          </label>

          <label className="grid gap-2">
            <span className="label-eyebrow">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="border-b border-ink bg-transparent pb-2 outline-none placeholder:text-ink-faint focus:border-signal"
            />
          </label>

          {state?.error && <p className="text-sm text-signal">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="border border-ink px-5 py-2.5 text-sm uppercase tracking-[0.1em] transition-colors hover:bg-ink hover:text-paper disabled:opacity-30"
          >
            {pending ? "Creating account…" : "Create Account"}
          </button>
        </form>
      )}

      <p className="mt-8 text-sm text-ink-soft">
        Already a member?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="underline hover:text-signal"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}

export default function SignupPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
