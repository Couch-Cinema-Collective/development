import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** The season arc, as a pitch: what joining actually gets you. */
const ARC = [
  { label: "Nominate", note: "Five points, spent on conviction" },
  { label: "Tally", note: "The guild's slate emerges" },
  { label: "Slate", note: "Nominators revealed, films locked" },
  { label: "Watch", note: "On your own time, together" },
  { label: "Vote", note: "One pick per award — if you finished" },
  { label: "Ceremony", note: "Envelopes, credits, a record that grows" },
];

export default async function LandingPage() {
  // Signed-in members skip the pitch and land on their guilds.
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/welcome");
  }

  return (
    <main>
      <section className="pattern-signal">
        <div className="mx-auto max-w-7xl px-6 py-24 text-paper">
          <p className="label-eyebrow text-paper/70">Couch Cinema Collective</p>
          <h1 className="mt-4 max-w-3xl text-balance text-7xl font-medium uppercase leading-[0.92] tracking-tight">
            A film society with an awards night
          </h1>
          <p className="mt-6 max-w-md text-paper/85">
            Your guild nominates a season of cinema, watches it together, and
            settles it the honest way — with a ceremony. Recognition comes from
            what you nominated, not points we made up.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="inline-block bg-ink px-8 py-4 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-paper hover:text-ink"
            >
              Start a guild
            </Link>
            <Link
              href="/login"
              className="inline-block border border-paper px-8 py-4 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-paper hover:text-ink"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-6 max-w-md text-sm text-paper/70">
            Invited to someone&apos;s guild? Their invite link is your way in —
            one click and you&apos;re on the roster.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="label-eyebrow">How a season runs</h2>

        <ol className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-6">
          {ARC.map((step, index) => (
            <li key={step.label} className="bg-paper-raised px-5 py-6">
              <span className="label-eyebrow">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-2 text-sm font-medium uppercase tracking-tight">
                {step.label}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                {step.note}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-16 grid gap-px border border-rule bg-rule sm:grid-cols-3">
          <div className="bg-paper-raised px-6 py-8">
            <p className="label-eyebrow">The stakes</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Every member gets five nomination points a season. Spread them or
              go all-in — who backed what stays hidden until the slate locks.
            </p>
          </div>
          <div className="bg-paper-raised px-6 py-8">
            <p className="label-eyebrow">The rule</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              If you don&apos;t finish the movies, you just don&apos;t get to
              vote. That&apos;s the whole eligibility system.
            </p>
          </div>
          <div className="bg-paper-raised px-6 py-8">
            <p className="label-eyebrow">The record</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Nominate a film that wins and the award is credited to you — a
              lifetime record that grows season over season.
            </p>
          </div>
        </div>

        <p className="mt-16 text-sm text-ink-soft">
          Curious before committing? The{" "}
          <Link href="/wiki" className="underline hover:text-signal">
            film school
          </Link>{" "}
          is open to everyone.
        </p>
      </section>
    </main>
  );
}
