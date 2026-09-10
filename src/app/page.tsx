import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MAX_CURATORS, MIN_CURATORS, VOICE_OF_THE_PEOPLE } from "@/lib/types";

/** The festival arc, as a pitch. Five beats — the machinery is implied. */
const ARC = [
  { label: "Nominate", note: "Everyone in the guild nominates a film for the festival" },
  { label: "Programme", note: "Nominated films are voted into the festival" },
  { label: "Screen", note: "Watch one film, once a week" },
  { label: "Review", note: "Write an anonymous review" },
  {
    label: "Award",
    note: `Best Film and ${VOICE_OF_THE_PEOPLE} take home the awards`,
  },
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
          <p className="text-2xl font-medium uppercase tracking-[0.08em] text-paper sm:text-3xl">
            Couch Cinema Collective
          </p>
          <h1 className="mt-4 max-w-3xl text-balance text-7xl font-medium uppercase leading-[0.92] tracking-tight">
            Film Festival with your Friends
          </h1>
          <p className="mt-6 max-w-md text-paper/85">
            Establish a guild. Premiere your own festival. Compete with your
            friends for who has the best taste in cinema. All from your couch.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="inline-block bg-ink px-8 py-4 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-paper hover:text-ink"
            >
              Establish a guild
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
        <h2 className="text-center text-4xl font-medium uppercase tracking-tight sm:text-5xl">
          How it works
        </h2>

        <ol className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-5">
          {ARC.map((step, index) => (
            <li key={step.label} className="bg-paper-raised px-6 py-8">
              <span className="label-eyebrow">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-2 text-2xl font-medium uppercase tracking-tight">
                {step.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-faint">
                {step.note}
              </p>
            </li>
          ))}
        </ol>

        {/* The role fork, stated up front — it is the first thing we ask. */}
        <div className="mt-16 grid gap-px border border-rule bg-rule sm:grid-cols-2">
          <div className="bg-paper-raised px-8 py-10">
            <p className="label-eyebrow text-signal">Curator</p>
            <p className="mt-3 text-3xl font-medium uppercase tracking-tight">
              You back a film
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Each festival nominates {MIN_CURATORS}–{MAX_CURATORS} films. If
              your film was nominated, you are a curator! Think producer —
              placing your bet that this film will win it all. Anonymously
              campaign for your film, bring home the Best Film award and win
              the festival!
            </p>
          </div>
          <div className="bg-paper-raised px-8 py-10">
            <p className="label-eyebrow">Critic</p>
            <p className="mt-3 text-3xl font-medium uppercase tracking-tight">
              You decide it
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Critics are the voting body — the ones who decide the festival
              winner! Watch each film, write a review, and win points for
              having the funniest or most insightful critiques. The sharpest
              reviewer takes {VOICE_OF_THE_PEOPLE} — awarding the best critic
              of the festival!
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm text-ink-faint">
          Every curator is a critic too. Curating is the extra job, not the
          alternative to it.
        </p>

        <div className="mt-16 grid gap-px border border-rule bg-rule sm:grid-cols-3">
          <div className="bg-paper-raised px-6 py-8">
            <p className="label-eyebrow">The rhythm</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              A week to watch, two days to review, twenty-four hours to vote.
              Miss a window, and forfeit your chances to win it all.
            </p>
          </div>
          <div className="bg-paper-raised px-6 py-8">
            <p className="label-eyebrow">The reviews</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Curators and critics of each film are anonymous. Winners are
              based off taste, not popularity.
            </p>
          </div>
          <div className="bg-paper-raised px-6 py-8">
            <p className="label-eyebrow">The awards</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Each festival gives out two top awards — “Best Film” and “{VOICE_OF_THE_PEOPLE}.” May
              the best win the fest!
            </p>
          </div>
        </div>

        <p className="mt-16 text-sm text-ink-soft">
          Curious before committing? The{" "}
          <Link href="/wiki" className="underline hover:text-signal">
            film collection
          </Link>{" "}
          is open to everyone.
        </p>
      </section>
    </main>
  );
}
