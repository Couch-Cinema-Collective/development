import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateGuildForm, JoinGuildForm } from "@/components/GuildForms";
import { getUserMemberships } from "@/lib/guilds";
import { createClient } from "@/lib/supabase/server";

/**
 * Post-sign-in hub, and the onboarding fork: members with guilds get their
 * list; a fresh account gets the two paths in (found a guild → commissioner,
 * invite code → member).
 */
export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/welcome");

  const memberships = await getUserMemberships();
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

      {memberships.length > 0 && (
        <ul className="mt-10 grid gap-px border border-rule bg-rule">
          {memberships.map((m) => (
            <li key={m.guildId} className="bg-paper-raised">
              <Link
                href={`/guild/${m.guildId}`}
                className="flex items-baseline justify-between gap-6 px-6 py-5 transition-colors hover:bg-paper"
              >
                <span className="text-xl font-medium uppercase tracking-tight">
                  {m.guildName}
                </span>
                <span className="label-eyebrow">
                  {m.role === "commissioner" ? "President" : "Member"} ·{" "}
                  {m.memberCount} {m.memberCount === 1 ? "member" : "members"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {memberships.length === 0 && (
        <p className="mt-10 max-w-xl leading-relaxed text-ink-soft">
          You&apos;re not in a guild yet. Found your own and run the season as
          commissioner, or join one with the invite code your commissioner
          shared.
        </p>
      )}

      <div className="mt-12 grid gap-12 sm:grid-cols-2">
        <section>
          <h2 className="label-eyebrow border-b border-rule pb-2">
            Found a guild
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            You become its president: you set up seasons, lock the slate,
            and publish the ceremony.
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
            Have an invite code or link? You&apos;ll join as a member —
            nominating, watching, and voting all season.
          </p>
          <div className="mt-6">
            <JoinGuildForm />
          </div>
        </section>
      </div>
    </main>
  );
}
