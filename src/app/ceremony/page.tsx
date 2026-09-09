import Link from "next/link";
import { redirect } from "next/navigation";

import { Ceremony } from "@/components/Ceremony";
import { Countdown } from "@/components/Countdown";
import { getCurrentFestival } from "@/lib/guilds";
import { ceremonyOrder } from "@/lib/mock/awards";
import { createClient } from "@/lib/supabase/server";
import type { AwardCategory, AwardResult, Film, Member } from "@/lib/types";

export default async function CeremonyPage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const { guild: guildParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ceremony");

  const festival = await getCurrentFestival(
    ["CEREMONY", "ARCHIVED"],
    guildParam,
  );

  if (!festival) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow">The Ceremony</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          No envelope yet
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">
          The ceremony plays here once your president publishes the results.
          Until then, the suspense is the point —{" "}
          <Link href="/vote" className="underline hover:text-signal">
            cast your ballot
          </Link>{" "}
          if voting is open.
        </p>
      </main>
    );
  }

  // The reveal gate: results stay sealed (and RLS returns nothing) until
  // the moment the president scheduled. The guild gets the countdown; the
  // president sees straight through to check the envelope.
  const [{ data: festivalRow }, { data: myMembership }] = await Promise.all([
    supabase
      .from("festivals")
      .select("ceremony_at")
      .eq("id", festival.id)
      .maybeSingle(),
    supabase
      .from("guild_members")
      .select("role")
      .eq("guild_id", festival.guildId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const ceremonyAt = festivalRow?.ceremony_at ?? null;
  const isPresident = myMembership?.role === "president";
  if (ceremonyAt && new Date(ceremonyAt) > new Date() && !isPresident) {
    return (
      <main className="pattern-signal-dark flex min-h-screen items-center px-6">
        <div className="mx-auto max-w-2xl py-16 text-center">
          <p className="label-eyebrow text-paper/60">
            {festival.guildName} · Festival {festival.number}
          </p>
          <h1 className="mt-5 break-words text-balance text-4xl font-medium uppercase leading-[0.95] tracking-tight text-paper sm:text-6xl">
            The ceremony airs soon
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-paper/70">
            The envelopes are sealed. Your president has set the moment.
          </p>
          <div className="mt-10 flex justify-center text-paper">
            <Countdown deadline={ceremonyAt} expiredLabel="Refresh — it's time" />
          </div>
        </div>
      </main>
    );
  }

  const [
    { data: resultRows },
    { data: awardRows },
    { data: lineupRows },
    { data: standings },
  ] = await Promise.all([
    supabase
      .from("award_results")
      .select("award_id, tmdb_id, votes, total_votes, curator_id, winner_id")
      .eq("festival_id", festival.id),
    supabase
      .from("festival_awards")
      .select("award_id, name, tier, scoring")
      .eq("festival_id", festival.id),
    supabase
      .from("lineup_films")
      .select("tmdb_id, film, curator_id")
      .eq("festival_id", festival.id),
    supabase.rpc("critic_standings_v2", { fid: festival.id }),
  ]);

  const awardsInOrder = ceremonyOrder(
    (awardRows ?? []).map(
      (a): AwardCategory => ({
        id: a.award_id,
        name: a.name,
        tier: a.tier as AwardCategory["tier"],
        scoring: a.scoring,
      }),
    ),
  );
  // Ties stand: an award may carry several winning rows, each its own card.
  const rowsByAward = new Map<string, NonNullable<typeof resultRows>>();
  for (const r of resultRows ?? []) {
    const bucket = rowsByAward.get(r.award_id) ?? [];
    bucket.push(r);
    rowsByAward.set(r.award_id, bucket);
  }

  const results: AwardResult[] = awardsInOrder.flatMap((award) =>
    (rowsByAward.get(award.id) ?? [])
      .filter((row) => row.tmdb_id !== null)
      .map((row) => ({
        awardId: award.id,
        awardName: award.name,
        filmId: row.tmdb_id as number,
        votes: row.votes,
        totalVotes: row.total_votes,
        scoring: award.scoring ?? false,
        curatorId: row.curator_id,
      })),
  );

  const filmsById = Object.fromEntries(
    (lineupRows ?? []).map((r) => [r.tmdb_id, r.film as Film]),
  );

  // Best Critic: the published, penalty-checked winner (leaderboard points
  // plus Best Review ballots). Older festivals published before v2 fall
  // back to the raw standings.
  const criticRows = (rowsByAward.get("best-critic") ?? []).filter(
    (r) => r.winner_id,
  );
  const ranked = (standings ?? []) as { user_id: string; points?: number; upvotes?: number }[];
  const voice = criticRows[0]
    ? { memberId: criticRows[0].winner_id as string, upvotes: criticRows[0].votes }
    : ranked[0]
      ? {
          memberId: ranked[0].user_id,
          upvotes: Number(ranked[0].points ?? ranked[0].upvotes ?? 0),
        }
      : null;

  // Names for the credits, the closing tally, and the critics' award.
  const memberIds = [
    ...new Set(
      [
        ...(lineupRows ?? []).map((r) => r.curator_id),
        ...(resultRows ?? []).map((r) => r.curator_id),
        voice?.memberId,
      ].filter((id): id is string => !!id),
    ),
  ];
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
    : { data: [] };
  const membersById = Object.fromEntries(
    (profiles ?? []).map((p): [string, Member] => [
      p.id,
      {
        id: p.id,
        name: p.full_name || "Member",
        role: "curator",
        awards: [],
        festivalsPlayed: 0,
      },
    ]),
  );

  // Tonight's curator tally — a count, not a currency. The curator who took
  // Best of the Fest leads it regardless of how many honours anyone else got.
  const counts = new Map<string, { count: number; best: boolean }>();
  for (const result of results) {
    if (!result.curatorId) continue;
    const entry = counts.get(result.curatorId) ?? { count: 0, best: false };
    entry.count += 1;
    if (result.scoring) entry.best = true;
    counts.set(result.curatorId, entry);
  }
  const tally = [...counts.entries()]
    .map(([memberId, e]) => ({
      memberId,
      count: e.count,
      wonBestOfTheFest: e.best,
    }))
    .sort(
      (a, b) =>
        Number(b.wonBestOfTheFest) - Number(a.wonBestOfTheFest) ||
        b.count - a.count,
    );

  return (
    <Ceremony
      results={results}
      filmsById={filmsById}
      membersById={membersById}
      tally={tally}
      voiceOfThePeople={voice}
      festivalNumber={festival.number}
      theme={festival.theme}
      guildName={festival.guildName}
    />
  );
}
