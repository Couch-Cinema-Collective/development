import Link from "next/link";
import { redirect } from "next/navigation";

import { CopyButton } from "@/components/CopyButton";
import { SeasonControls } from "@/components/SeasonControls";
import { getGuildHome, getGuildSeasons } from "@/lib/guilds";
import { createClient } from "@/lib/supabase/server";
import type { Film } from "@/lib/types";

/** Member-facing label per season state (PLAN.md §2). */
const STATE_LABELS: Record<string, string> = {
  DRAFT: "Setting up",
  NOMINATING: "Nominating now",
  TALLYING: "Slate being calculated",
  SLATE_LOCKED: "Slate locked",
  WATCHING: "Watching",
  VOTING: "Voting open",
  PUBLISHED: "Ceremony published",
  ARCHIVED: "Archived",
};

/** Guild home: the left rail is the season's navigation (design review). */
export default async function GuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/guild/${id}`)}`);

  const guild = await getGuildHome(id);
  // Not a member (or no such guild) — RLS returns nothing either way.
  if (!guild) redirect("/welcome");

  const seasons = await getGuildSeasons(id);
  const current = seasons.find(
    (s) => s.state !== "ARCHIVED" && s.state !== "PUBLISHED",
  );
  const finished = seasons.filter(
    (s) => s.state === "PUBLISHED" || s.state === "ARCHIVED",
  );

  // The slate, once it exists for the running season.
  const slateVisible =
    current && ["SLATE_LOCKED", "WATCHING", "VOTING"].includes(current.state);
  const { data: slateRows } = slateVisible
    ? await supabase
        .from("slate_films")
        .select("tmdb_id, film")
        .eq("season_id", current.id)
    : { data: null };
  const slate = (slateRows ?? []).map((r) => r.film as Film);

  const president = guild.role === "commissioner";

  const rail = [
    {
      label: "The Draft",
      href: `/draft?guild=${guild.id}`,
      live: current?.state === "NOMINATING",
      note: "Nominate",
    },
    {
      label: "In Season",
      href: `/season?guild=${guild.id}`,
      live:
        !!current &&
        ["SLATE_LOCKED", "WATCHING", "VOTING"].includes(current.state),
      note: "Watch & review",
    },
    {
      label: "The Ballot",
      href: `/vote?guild=${guild.id}`,
      live: current?.state === "VOTING",
      note: "Vote",
    },
    {
      label: "The Ceremony",
      href: `/ceremony?guild=${guild.id}`,
      live: finished.length > 0,
      note: "Results",
    },
  ];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const inviteUrl = `${siteUrl}/join/${guild.inviteCode}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">
          {president ? "Your guild · President" : "Your guild"}
        </p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          {guild.name}
        </h1>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[220px_1fr]">
        {/* Season navigation rail — the flow lives here, not in the top nav. */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="label-eyebrow border-b border-rule pb-2">
            {current
              ? `Season ${current.number} · ${current.category}`
              : "Between seasons"}
          </p>
          <ul className="mt-1">
            {rail.map((item) => (
              <li key={item.label} className="border-b border-rule">
                {item.live ? (
                  <Link
                    href={item.href}
                    className="group flex items-baseline justify-between gap-3 py-3.5 transition-colors hover:text-signal"
                  >
                    <span className="text-sm font-medium uppercase tracking-tight">
                      {item.label}
                    </span>
                    <span className="label-eyebrow group-hover:text-signal">
                      {item.note}
                    </span>
                  </Link>
                ) : (
                  <span className="flex items-baseline justify-between gap-3 py-3.5 opacity-35">
                    <span className="text-sm uppercase tracking-tight">
                      {item.label}
                    </span>
                    <span className="label-eyebrow">{item.note}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
          {current && (
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              {STATE_LABELS[current.state] ?? current.state}
              {current.state === "NOMINATING" &&
                current.nominationDeadline &&
                ` · locks ${new Date(current.nominationDeadline).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`}
            </p>
          )}
        </aside>

        <div className="min-w-0">
          {president && (
            <section className="border border-rule bg-paper-raised p-6">
              <h2 className="label-eyebrow">Invite your members</h2>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <code className="min-w-0 flex-1 break-all text-sm">
                  {inviteUrl}
                </code>
                <CopyButton text={inviteUrl} />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink-faint">
                Anyone with this link can join until the guild hits its{" "}
                {guild.maxMembers}-member cap.
              </p>
            </section>
          )}

          <section className={president ? "mt-10" : ""}>
            <h2 className="label-eyebrow border-b border-rule pb-2">Season</h2>

            {current ? (
              <div className="mt-4 border border-ink bg-paper-raised p-6">
                <p className="label-eyebrow text-signal">
                  {STATE_LABELS[current.state] ?? current.state}
                </p>
                <h3 className="mt-2 text-3xl font-medium uppercase leading-none tracking-tight">
                  Season {current.number} · {current.category}
                </h3>
                <p className="mt-3 text-sm text-ink-soft">
                  {current.filmCount} films on the slate
                  {current.state === "NOMINATING" &&
                    current.nominationDeadline && (
                      <>
                        {" "}
                        · nominations lock{" "}
                        {new Date(
                          current.nominationDeadline,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                        })}
                      </>
                    )}
                </p>

                {slate.length > 0 && (
                  <div className="mt-6">
                    <p className="label-eyebrow">The slate</p>
                    <ul className="mt-3 grid gap-1.5">
                      {slate.map((film) => (
                        <li
                          key={film.id}
                          className="flex items-baseline gap-3 text-sm"
                        >
                          <span className="font-medium tracking-tight">
                            {film.title}
                          </span>
                          <span className="text-xs text-ink-faint">
                            {film.year}
                            {film.director ? ` · ${film.director}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {president && (
                  <SeasonControls
                    seasonId={current.id}
                    state={current.state}
                    deadline={current.nominationDeadline}
                  />
                )}
              </div>
            ) : president ? (
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
                No season running. Once your members are in,{" "}
                <Link
                  href={`/commissioner/new?guild=${guild.id}`}
                  className="underline hover:text-signal"
                >
                  set up the season
                </Link>{" "}
                — pick the category, the awards, and open nominations.
              </p>
            ) : (
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
                No season running yet — your guild president opens the next
                one.
              </p>
            )}

            {finished.length > 0 && (
              <ul className="mt-6 grid gap-px border border-rule bg-rule">
                {finished.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-baseline justify-between gap-6 bg-paper-raised px-6 py-4"
                  >
                    <span className="font-medium uppercase tracking-tight">
                      Season {s.number} · {s.category}
                    </span>
                    <span className="label-eyebrow">
                      {STATE_LABELS[s.state]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-12">
            <h2 className="label-eyebrow border-b border-rule pb-2">
              Roster · {guild.roster.length} of {guild.maxMembers}
            </h2>
            <ul className="mt-4 grid gap-px border border-rule bg-rule">
              {guild.roster.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-baseline justify-between gap-6 bg-paper-raised px-6 py-4"
                >
                  <span className="font-medium">
                    {m.fullName}
                    {m.userId === user.id && (
                      <span className="ml-2 text-xs text-ink-faint">(you)</span>
                    )}
                  </span>
                  <span className="label-eyebrow">
                    {m.role === "commissioner" ? "President" : "Member"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
