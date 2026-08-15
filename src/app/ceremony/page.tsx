import Link from "next/link";
import { redirect } from "next/navigation";

import { Ceremony } from "@/components/Ceremony";
import { getUserMemberships } from "@/lib/guilds";
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

  const memberships = await getUserMemberships();
  const guildIds = memberships.map((m) => m.guildId);
  const { data: published } = guildIds.length
    ? await supabase
        .from("seasons")
        .select("id, guild_id, number, category")
        .in("guild_id", guildIds)
        .in("state", ["PUBLISHED", "ARCHIVED"])
        .order("number", { ascending: false })
    : { data: [] };

  const season =
    (published ?? []).find((s) => s.guild_id === guildParam) ??
    (published ?? [])[0];

  if (!season) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow">The Ceremony</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          No envelope yet
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">
          The ceremony plays here once your guild president publishes a season&apos;s
          results. Until then, the suspense is the point —{" "}
          <Link href="/vote" className="underline hover:text-signal">
            cast your ballot
          </Link>{" "}
          if voting is open.
        </p>
      </main>
    );
  }

  const guildName =
    memberships.find((m) => m.guildId === season.guild_id)?.guildName ?? "";

  const [
    { data: resultRows },
    { data: awardRows },
    { data: slateRows },
    { data: nominationRows },
  ] = await Promise.all([
    supabase
      .from("award_results")
      .select("award_id, tmdb_id, votes, total_votes")
      .eq("season_id", season.id),
    supabase
      .from("season_awards")
      .select("award_id, name, tier")
      .eq("season_id", season.id),
    supabase
      .from("slate_films")
      .select("tmdb_id, film")
      .eq("season_id", season.id),
    // Post-publish, RLS reveals every nomination — this is what turns
    // winners into nominator credits (§1.3).
    supabase
      .from("nominations")
      .select("tmdb_id, user_id")
      .eq("season_id", season.id),
  ]);

  const awardsInOrder = ceremonyOrder(
    (awardRows ?? []).map(
      (a): AwardCategory => ({
        id: a.award_id,
        name: a.name,
        tier: a.tier as AwardCategory["tier"],
      }),
    ),
  );
  const resultByAward = new Map((resultRows ?? []).map((r) => [r.award_id, r]));

  const nominatorsOf = (tmdbId: number) => [
    ...new Set(
      (nominationRows ?? [])
        .filter((n) => n.tmdb_id === tmdbId)
        .map((n) => n.user_id),
    ),
  ];

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
        nominatorIds: nominatorsOf(row.tmdb_id),
      },
    ];
  });

  const filmsById = Object.fromEntries(
    (slateRows ?? []).map((r) => [r.tmdb_id, r.film as Film]),
  );

  // Member names for credits and the closing tally.
  const memberIds = [...new Set((nominationRows ?? []).map((n) => n.user_id))];
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
    : { data: [] };
  const membersById = Object.fromEntries(
    (profiles ?? []).map((p): [string, Member] => [
      p.id,
      { id: p.id, name: p.full_name || "Member", awards: [], seasonsPlayed: 0 },
    ]),
  );

  // Tonight's nominator tally — a count, not a currency (§1.3).
  const counts = new Map<string, number>();
  for (const result of results) {
    for (const memberId of result.nominatorIds) {
      counts.set(memberId, (counts.get(memberId) ?? 0) + 1);
    }
  }
  const tally = [...counts.entries()]
    .map(([memberId, count]) => ({ memberId, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <Ceremony
      results={results}
      filmsById={filmsById}
      membersById={membersById}
      tally={tally}
      seasonNumber={season.number}
      seasonCategory={season.category}
      guildName={guildName}
    />
  );
}
