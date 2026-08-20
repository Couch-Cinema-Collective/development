import Link from "next/link";
import { redirect } from "next/navigation";

import { Dashboard, type ThreadReview } from "@/components/Dashboard";
import { GuildSwitcher } from "@/components/GuildSwitcher";
import { getCurrentFestival, getUserMemberships } from "@/lib/guilds";
import { currentFilm, nextFilm, toLineup, type LineupRow } from "@/lib/lineup";
import { createClient } from "@/lib/supabase/server";
import { isCurator, type GuildRole } from "@/lib/types";

/** States in which a member has something to do film by film. */
const LIVE_STATES = ["LINEUP_SET", "SCREENING", "AWARDS_VOTING"];

/**
 * The member's home during a festival.
 *
 * Everything here answers one question — what do I owe, and how long have I
 * got? The current film and its countdown lead; standing and what is coming
 * sit alongside; the lineup shows how far the festival has got.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const { guild: guildParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [festival, memberships] = await Promise.all([
    getCurrentFestival(LIVE_STATES, guildParam),
    getUserMemberships(),
  ]);

  if (!festival) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow">Dashboard</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          No festival running
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">
          {memberships.length === 0 ? (
            <>
              You&apos;re not in a guild yet.{" "}
              <Link href="/welcome" className="underline hover:text-signal">
                Establish or join one
              </Link>{" "}
              to get started.
            </>
          ) : (
            <>
              Nothing is screening right now. When your president sets the
              lineup, this is where the clock appears —{" "}
              <Link href="/welcome" className="underline hover:text-signal">
                your guilds
              </Link>{" "}
              in the meantime.
            </>
          )}
        </p>
      </main>
    );
  }

  const [
    { data: lineupRows },
    { data: watchedRows },
    { data: myReviews },
    { data: standings },
    { data: membership },
  ] = await Promise.all([
    supabase
      .from("lineup_films")
      .select(
        "tmdb_id, film, position, curator_id, viewing_starts_at, review_starts_at, voting_starts_at, closes_at",
      )
      .eq("festival_id", festival.id),
    supabase
      .from("watch_records")
      .select("tmdb_id")
      .eq("festival_id", festival.id)
      .eq("user_id", user.id),
    supabase
      .from("reviews")
      .select("tmdb_id, body")
      .eq("festival_id", festival.id)
      .eq("user_id", user.id),
    supabase.rpc("critic_standings", { fid: festival.id }),
    supabase
      .from("guild_members")
      .select("role")
      .eq("guild_id", festival.guildId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  // Rows exist as soon as the lineup is drawn, but carry no windows until the
  // president opens the festival — toLineup drops those, so count them here.
  const lineup = toLineup((lineupRows ?? []) as LineupRow[]);
  const drawnButNotOpen = lineup.length === 0 ? (lineupRows ?? []).length : 0;
  const current = currentFilm(lineup);
  const next = nextFilm(lineup);

  // The review thread and upvote budget only matter for the film that is on.
  const [{ data: threadRows }, { data: budget }] = current
    ? await Promise.all([
        supabase.rpc("film_reviews", {
          fid: festival.id,
          tid: current.film.id,
        }),
        supabase
          .rpc("my_upvote_budget", { fid: festival.id, tid: current.film.id })
          .maybeSingle(),
      ])
    : [{ data: [] }, { data: null }];

  // Authors are only ever returned once a film's window has shut.
  type ReviewRow = {
    id: string;
    user_id: string | null;
    body: string;
    eligible: boolean;
    upvotes: number;
    upvoted_by_me: boolean;
    mine: boolean;
  };
  const rows = (threadRows ?? []) as ReviewRow[];
  const authorIds = [
    ...new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)),
  ];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name || "Member"]),
  );

  const myReviewBody =
    (myReviews ?? []).find((r) => r.tmdb_id === current?.film.id)?.body ?? "";

  const thread: ThreadReview[] = rows.map((r) => ({
    id: r.id,
    authorName: r.user_id ? (nameById.get(r.user_id) ?? "Member") : null,
    body: r.body,
    eligible: r.eligible,
    upvotes: Number(r.upvotes),
    upvotedByMe: r.upvoted_by_me,
    // The server says so — before the reveal there is no id to compare.
    mine: r.mine,
  }));

  const myStanding = (
    (standings ?? []) as { user_id: string; upvotes: number }[]
  ).find((s) => s.user_id === user.id);

  // Festival awards this member's nominations have already taken.
  const { data: wins } = await supabase
    .from("award_results")
    .select("award_id")
    .eq("festival_id", festival.id)
    .eq("curator_id", user.id);

  const role = (membership?.role ?? "critic") as GuildRole;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="border-b border-rule pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="label-eyebrow">
              {festival.guildName} · Festival {festival.number}
            </p>
            <h1 className="mt-3 text-balance text-5xl font-medium uppercase leading-none tracking-tight">
              {festival.theme}
            </h1>
          </div>
          <GuildSwitcher
            guilds={memberships.map((m) => ({
              guildId: m.guildId,
              guildName: m.guildName,
            }))}
            activeGuildId={festival.guildId}
          />
        </div>
      </header>

      <div className="mt-10">
        <Dashboard
          festivalId={festival.id}
          guildId={festival.guildId}
          guildName={festival.guildName}
          festivalNumber={festival.number}
          theme={festival.theme}
          lineup={lineup}
          current={current}
          next={next}
          watchedIds={(watchedRows ?? []).map((w) => w.tmdb_id)}
          thread={thread}
          myReview={myReviewBody}
          upvotesSpent={(budget as { spent: number } | null)?.spent ?? 0}
          upvotesEarned={Number(myStanding?.upvotes ?? 0)}
          reviewsFiled={(myReviews ?? []).length}
          festivalAwards={(wins ?? []).length}
          isCurator={isCurator(role)}
          drawnButNotOpen={drawnButNotOpen}
        />
      </div>
    </main>
  );
}
