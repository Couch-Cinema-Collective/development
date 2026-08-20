import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  BEST_OF_THE_FEST,
  MAX_CURATORS,
  MIN_CURATORS,
  REVIEW_MAX_CHARS,
  UPVOTES_PER_FILM,
  VOICE_OF_THE_PEOPLE,
} from "@/lib/types";

/** The festival arc, as a pitch. Four beats — the machinery is implied. */
const ARC = [
  { label: "Programme", note: "Every curator puts up one film" },
  { label: "Screen", note: "One film at a time, on the festival clock" },
  { label: "Review", note: `${REVIEW_MAX_CHARS} characters, anonymous` },
  { label: "Award", note: "The ceremony settles who had the taste" },
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
        <h2 className="label-eyebrow">How a festival runs</h2>

        <ol className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-4">
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
              A guild seats {MIN_CURATORS}–{MAX_CURATORS} curators, and each one
              puts a single film into the festival. Think producer, not critic:
              you stake your name on a pick, and if it takes {BEST_OF_THE_FEST},
              the win goes on your record.
            </p>
          </div>
          <div className="bg-paper-raised px-8 py-10">
            <p className="label-eyebrow">Critic</p>
            <p className="mt-3 text-3xl font-medium uppercase tracking-tight">
              You decide it
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Critics are the voting body — up to fifty of them. Watch each
              film, write {REVIEW_MAX_CHARS} characters on it, and spend{" "}
              {UPVOTES_PER_FILM} upvotes on the reviews that earned them. The
              sharpest writer takes {VOICE_OF_THE_PEOPLE}.
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
              A fortnight to watch, two days to write, twenty-four hours to
              vote. Then the next film opens. Miss a window and you miss it.
            </p>
          </div>
          <div className="bg-paper-raised px-6 py-8">
            <p className="label-eyebrow">The rule</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Reviews are anonymous until voting shuts, so people upvote the
              writing rather than the writer.
            </p>
          </div>
          <div className="bg-paper-raised px-6 py-8">
            <p className="label-eyebrow">The record</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {BEST_OF_THE_FEST} is the only award that scores. The rest are
              real trophies that count for nothing — which is the fun of them.
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
