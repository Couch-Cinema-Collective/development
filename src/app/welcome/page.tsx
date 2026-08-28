import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateGuildForm, JoinGuildForm } from "@/components/GuildForms";
import { LiveScreeningsCarousel } from "@/components/LiveScreeningsCarousel";
import { getAwardCredits } from "@/lib/awardCredits";
import { getUserMemberships } from "@/lib/guilds";
import { getLiveScreenings } from "@/lib/liveScreenings";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_CURATORS,
  MAX_CRITICS,
  MIN_CURATORS,
  VOICE_OF_THE_PEOPLE,
  isCurator,
} from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  president: "Guild President",
  curator: "Curator",
  critic: "Critic",
};

/**
 * Post-sign-in hub, and the onboarding fork.
 *
 * The founding notes open on one question — critic or curator? — so guilds
 * lead, in those words, before anything else. Below that: what's currently
 * open across those guilds, then the member's own record.
 */
export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/welcome");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const fullName =
    profile?.full_name ||
    (user.user_metadata.full_name as string | undefined) ||
    user.email ||
    "Member";
  const firstName = fullName.split(" ")[0];

  const [active, liveScreenings] = await Promise.all([
    getUserMemberships(),
    getLiveScreenings(),
  ]);
  const { festivalsWon, voiceWins, upvotesEarned, festivalsFinished } =
    await getAwardCredits(
      user.id,
      active.map((m) => m.guildId),
    );

  const stats = [
    { label: "Festivals finished", value: festivalsFinished },
    { label: "Festivals won", value: festivalsWon },
    { label: VOICE_OF_THE_PEOPLE, value: voiceWins },
    { label: "Upvotes earned", value: upvotesEarned },
  ];

  return (
    <main className="pattern-signal min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="border-b border-paper/25 pb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-paper/60">
            Couch Cinema Collective
          </p>
          <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight text-paper">
            Welcome{firstName ? `, ${firstName}` : ""}
          </h1>
        </header>

        <h2 className="mt-10 border-b border-paper/25 pb-2 text-xs uppercase tracking-[0.18em] text-paper/70">
          Guilds
        </h2>

        {active.length > 0 && (
          <ul className="mt-6 grid gap-px border border-paper/30 bg-paper/20">
            {active.map((m) => (
              <li key={m.guildId} className="bg-paper-raised">
                <Link
                  href={`/guild/${m.guildId}`}
                  className="flex items-baseline justify-between gap-6 px-6 py-5 transition-colors hover:bg-paper"
                >
                  <span className="text-xl font-medium uppercase tracking-tight">
                    {m.guildName}
                  </span>
                  <span className="label-eyebrow">
                    {ROLE_LABEL[m.role] ?? m.role} · {m.curatorCount} curator
                    {m.curatorCount === 1 ? "" : "s"} · {m.criticCount} critic
                    {m.criticCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {active.length === 0 && (
          <>
            <p className="mt-6 max-w-xl leading-relaxed text-paper/80">
              You&apos;re not in a guild yet. Two ways in, and the first
              question is which chair you want.
            </p>

            <div className="mt-8 grid gap-px border border-paper/30 bg-paper/20 sm:grid-cols-2">
              <div className="bg-paper-raised px-6 py-7">
                <p className="label-eyebrow text-signal">Curator</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  You put up one film per festival and compete for the
                  festival award. Seats are capped per guild, so they go first
                  come first served.
                </p>
              </div>
              <div className="bg-paper-raised px-6 py-7">
                <p className="label-eyebrow">Critic</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  You watch, review, and vote, with room for {MAX_CRITICS} a
                  guild — so there is effectively always a seat. Curators do
                  this too; it just isn&apos;t all they do.
                </p>
              </div>
            </div>
          </>
        )}

        {active.some((m) => isCurator(m.role)) && (
          <p className="mt-12 text-sm text-paper/70">
            Curating is on top of critiquing, never instead of it — you still
            watch, review, and vote on every film, your own included.
          </p>
        )}

        {/* What's open right now, across every guild — click straight in. */}
        {liveScreenings.length > 0 && (
          <section className="mt-12">
            <div className="pattern-ampelmann px-6 py-8 text-center sm:px-10 sm:py-12">
              <h2 className="text-balance text-6xl font-black uppercase leading-[0.85] tracking-tight text-ink sm:text-8xl">
                Now Playing
              </h2>
              <p className="mt-3 text-sm font-bold uppercase tracking-[0.35em] text-ink sm:mt-4 sm:text-base">
                In Your Festivals
              </p>
            </div>
            <div className="mt-6">
              <LiveScreeningsCarousel items={liveScreenings} />
            </div>
          </section>
        )}

        {/* Profile stats card. */}
        <div className="mt-10 border border-ink bg-paper-raised p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="text-xl font-medium uppercase tracking-tight">
              {fullName}
            </p>
            <Link
              href="/profile"
              className="label-eyebrow underline decoration-rule underline-offset-4 hover:text-signal"
            >
              Full profile →
            </Link>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-6 sm:flex sm:flex-wrap sm:gap-12">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="label-eyebrow">{s.label}</dt>
                <dd className="mt-1 text-3xl font-medium tabular-nums">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Separate from the guild list above — a new guild, not one of these. */}
        <div className="mt-16 border-t border-paper/25 pt-10">
          <div className="grid gap-12 sm:grid-cols-2">
            <section>
              <h2 className="label-eyebrow text-paper/70">
                Establish a guild
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-paper/80">
                You become its president: you decide how many of the{" "}
                {MIN_CURATORS}–{MAX_CURATORS} curator seats exist, set the
                festival theme, and run the ceremony.
              </p>
              <div className="mt-6 border border-ink bg-paper-raised p-6">
                <CreateGuildForm />
              </div>
            </section>

            <section>
              <h2 className="label-eyebrow text-paper/70">Join a guild</h2>
              <p className="mt-4 text-sm leading-relaxed text-paper/80">
                Have an invite code or link? Walk in as a critic, or take one
                of the curator seats if any are still free.
              </p>
              <div className="mt-6 border border-ink bg-paper-raised p-6">
                <JoinGuildForm />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
