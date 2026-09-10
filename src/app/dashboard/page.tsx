import Link from "next/link";
import { redirect } from "next/navigation";

import { Dashboard, type ThreadReview } from "@/components/Dashboard";
import { GuildSwitcher } from "@/components/GuildSwitcher";
import { getCurrentFestival, getUserMemberships } from "@/lib/guilds";
import {
  currentFilm,
  nextFilm,
  phaseOf,
  toLineup,
  type LineupRow,
} from "@/lib/lineup";
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
    { data: misses },
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
    supabase.rpc("critic_standings_v2", { fid: festival.id }),
    supabase.rpc("festival_misses", { fid: festival.id }),
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

  // Upvote budgets and the curator's anonymous pitch only matter for the
  // film that is on. Review threads matter for every film the carousel can
  // show — current plus anything already closed; film_reviews_v2 itself
  // returns nothing for a film still in VIEWING/REVIEWING, so asking for
  // those too is harmless.
  const withThreads = lineup.filter((f) => phaseOf(f) !== "UPCOMING");

  const [
    { data: budgetRows },
    { data: pitch },
    threadResults,
    { count: watchedCount },
    { count: totalMembers },
  ] = await Promise.all([
    current
      ? supabase.rpc("my_upvote_budgets", {
          fid: festival.id,
          tid: current.film.id,
        })
      : Promise.resolve({ data: [] }),
    current
      ? supabase.rpc("film_pitch", { fid: festival.id, tid: current.film.id })
      : Promise.resolve({ data: null }),
    Promise.all(
      withThreads.map(async (f) => {
        const { data } = await supabase.rpc("film_reviews_v2", {
          fid: festival.id,
          tid: f.film.id,
        });
        return { tmdbId: f.film.id, rows: (data ?? []) as ReviewRow[] };
      }),
    ),
    // Who's watched the film that's on — the guild-wide count, not just this
    // member's own mark. RLS explicitly allows reading the whole guild's
    // watch progress, not only your own row.
    current
      ? supabase
          .from("watch_records")
          .select("*", { count: "exact", head: true })
          .eq("festival_id", festival.id)
          .eq("tmdb_id", current.film.id)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("guild_members")
      .select("*", { count: "exact", head: true })
      .eq("guild_id", festival.guildId),
  ]);

  const spentByKind = new Map(
    ((budgetRows ?? []) as { kind: string; spent: number }[]).map((b) => [
      b.kind,
      b.spent,
    ]),
  );

  // Authors are only ever returned once a film's window has shut.
  type ReviewRow = {
    id: string;
    user_id: string | null;
    body: string;
    eligible: boolean;
    insightful: number;
    funniest: number;
    my_insightful: number;
    my_funniest: number;
    mine: boolean;
  };
  // Flags the member has already filed, and members they've blocked. A block
  // only bites once authorship is revealed — anonymous reviews have no
  // author to match, which is the point of the anonymity.
  const [{ data: myReportRows }, { data: blockRows }] = await Promise.all([
    supabase
      .from("review_reports")
      .select("review_id")
      .eq("reporter_id", user.id),
    supabase
      .from("member_blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id),
  ]);
  const reportedByMe = new Set((myReportRows ?? []).map((r) => r.review_id));
  const blocked = new Set((blockRows ?? []).map((b) => b.blocked_id));

  // Per film, drop reviews from members this viewer has blocked (their own
  // and any not-yet-anonymous review always stay visible).
  const filteredByFilm = threadResults.map(({ tmdbId, rows }) => ({
    tmdbId,
    rows: rows.filter((r) => r.mine || !r.user_id || !blocked.has(r.user_id)),
  }));

  const authorIds = [
    ...new Set(
      filteredByFilm
        .flatMap(({ rows }) => rows)
        .map((r) => r.user_id)
        .filter((id): id is string => !!id),
    ),
  ];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name || "Member"]),
  );

  const myReviewBody =
    (myReviews ?? []).find((r) => r.tmdb_id === current?.film.id)?.body ?? "";

  const toThread = (rows: ReviewRow[]): ThreadReview[] =>
    rows.map((r) => ({
      id: r.id,
      authorName: r.user_id ? (nameById.get(r.user_id) ?? "Member") : null,
      body: r.body,
      eligible: r.eligible,
      insightful: Number(r.insightful),
      funniest: Number(r.funniest),
      myInsightful: Number(r.my_insightful),
      myFunniest: Number(r.my_funniest),
      // The server says so — before the reveal there is no id to compare.
      mine: r.mine,
      reportedByMe: reportedByMe.has(r.id),
    }));

  const threadsByFilmId: Record<number, ThreadReview[]> = {};
  for (const { tmdbId, rows } of filteredByFilm) {
    threadsByFilmId[tmdbId] = toThread(rows);
  }

  const standingRows = (standings ?? []) as {
    user_id: string;
    points: number;
    reviews_written: number;
  }[];
  const myStanding = standingRows.find((s) => s.user_id === user.id);

  // Names for the board — top eight, plus wherever the member sits.
  const boardRows = standingRows.slice(0, 8);
  const boardIds = [...new Set(boardRows.map((b) => b.user_id))];
  const { data: boardProfiles } = boardIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", boardIds)
    : { data: [] };
  const boardNameById = new Map(
    (boardProfiles ?? []).map((b) => [b.id, b.full_name || "Member"]),
  );
  const leaderboard = boardRows.map((b) => ({
    name: boardNameById.get(b.user_id) ?? "Member",
    points: Number(b.points),
    me: b.user_id === user.id,
  }));

  const myMisses = Number(
    ((misses ?? []) as { user_id: string; missed: number }[]).find(
      (m) => m.user_id === user.id,
    )?.missed ?? 0,
  );

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
          threadsByFilmId={threadsByFilmId}
          myReview={myReviewBody}
          insightfulSpent={spentByKind.get("insightful") ?? 0}
          funniestSpent={spentByKind.get("funniest") ?? 0}
          pitch={typeof pitch === "string" ? pitch : ""}
          upvotesEarned={Number(myStanding?.points ?? 0)}
          leaderboard={leaderboard}
          myMisses={myMisses}
          reviewsFiled={(myReviews ?? []).length}
          festivalAwards={(wins ?? []).length}
          isCurator={isCurator(role)}
          isPresident={role === "president"}
          watchedCount={watchedCount ?? 0}
          totalMembers={totalMembers ?? 0}
          drawnButNotOpen={drawnButNotOpen}
        />
      </div>
    </main>
  );
}
