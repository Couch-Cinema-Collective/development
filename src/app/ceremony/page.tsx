import Link from "next/link";
import { redirect } from "next/navigation";

import { Ceremony } from "@/components/Ceremony";
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

  const [
    { data: resultRows },
    { data: awardRows },
    { data: lineupRows },
    { data: standings },
  ] = await Promise.all([
    supabase
      .from("award_results")
      .select("award_id, tmdb_id, votes, total_votes, curator_id")
      .eq("festival_id", festival.id),
    supabase
      .from("festival_awards")
      .select("award_id, name, tier, scoring")
      .eq("festival_id", festival.id),
    supabase
      .from("lineup_films")
      .select("tmdb_id, film, curator_id")
      .eq("festival_id", festival.id),
    supabase.rpc("critic_standings", { fid: festival.id }),
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
  const resultByAward = new Map((resultRows ?? []).map((r) => [r.award_id, r]));

  const results: AwardResult[] = awardsInOrder.flatMap((award) => {
    const row = resultByAward.get(award.id);
    if (!row) return [];
    return [
      {
        awardId: award.id,
        awardName: award.name,
        filmId: row.tmdb_id,
        votes: row.votes,
        totalVotes: row.total_votes,
        scoring: award.scoring ?? false,
        curatorId: row.curator_id,
      },
    ];
  });

  const filmsById = Object.fromEntries(
    (lineupRows ?? []).map((r) => [r.tmdb_id, r.film as Film]),
  );

  // Voice of the People: most upvoted reviewer of the festival. Everyone is
  // eligible — every curator is a critic too, so the writing stands on its own.
  const ranked = (standings ?? []) as { user_id: string; upvotes: number }[];
  const voice = ranked[0]
    ? { memberId: ranked[0].user_id, upvotes: Number(ranked[0].upvotes) }
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
