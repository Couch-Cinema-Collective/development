import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateGuildForm, JoinGuildForm } from "@/components/GuildForms";
import { getUserMemberships } from "@/lib/guilds";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_CURATORS,
  MAX_CRITICS,
  MIN_CURATORS,
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
 * The founding notes open on one question — critic or curator? — so that is
 * what this page asks, in those words, before anything else.
 */
export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/welcome");

  const memberships = await getUserMemberships();
  const active = memberships.filter((m) => m.status === "active");
  const pending = memberships.filter((m) => m.status === "pending");
  const firstName = (
    (user.user_metadata.full_name as string | undefined) ??
    user.email ??
    ""
  ).split(" ")[0];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">Welcome{firstName ? `, ${firstName}` : ""}</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          Your Guilds
        </h1>
      </header>

      {active.length > 0 && (
        <ul className="mt-10 grid gap-px border border-rule bg-rule">
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

      {pending.length > 0 && (
        <ul className="mt-6 grid gap-px border border-rule bg-rule">
          {pending.map((m) => (
            <li
              key={m.guildId}
              className="flex items-baseline justify-between gap-6 bg-paper-raised px-6 py-5"
            >
              <span className="text-xl font-medium uppercase tracking-tight text-ink-faint">
                {m.guildName}
              </span>
              <span className="label-eyebrow">
                Curator seat · awaiting the president
              </span>
            </li>
          ))}
        </ul>
      )}

      {active.length === 0 && pending.length === 0 && (
        <>
          <p className="mt-10 max-w-xl leading-relaxed text-ink-soft">
            You&apos;re not in a guild yet. Two ways in, and the first question
            is which chair you want.
          </p>

          <div className="mt-8 grid gap-px border border-rule bg-rule sm:grid-cols-2">
            <div className="bg-paper-raised px-6 py-7">
              <p className="label-eyebrow text-signal">Curator</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                You put up one film per festival and compete for the festival
                award. Seats are limited to {MAX_CURATORS} a guild, so the
                president approves them.
              </p>
            </div>
            <div className="bg-paper-raised px-6 py-7">
              <p className="label-eyebrow">Critic</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                You watch, review, and vote — no approval needed, up to{" "}
                {MAX_CRITICS} a guild. Curators do this too; it just isn&apos;t
                all they do.
              </p>
            </div>
          </div>
        </>
      )}

      <div className="mt-12 grid gap-12 sm:grid-cols-2">
        <section>
          <h2 className="label-eyebrow border-b border-rule pb-2">
            Establish a guild
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            You become its president: you seat {MIN_CURATORS}–{MAX_CURATORS}{" "}
            curators, set the festival theme, and run the ceremony.
          </p>
          <div className="mt-6">
            <CreateGuildForm />
          </div>
        </section>

        <section>
          <h2 className="label-eyebrow border-b border-rule pb-2">
            Join a guild
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Have an invite code or link? Walk in as a critic, or apply for a
            curator seat and wait for the president to approve it.
          </p>
          <div className="mt-6">
            <JoinGuildForm />
          </div>
        </section>
      </div>

      {active.some((m) => isCurator(m.role)) && (
        <p className="mt-12 text-sm text-ink-faint">
          Curating is on top of critiquing, never instead of it — you still
          watch, review, and vote on every film, your own included.
        </p>
      )}
    </main>
  );
}
