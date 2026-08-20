import Link from "next/link";
import { redirect } from "next/navigation";

import { Ballot } from "@/components/Ballot";
import { getCurrentFestival } from "@/lib/guilds";
import { ceremonyOrder } from "@/lib/mock/awards";
import { toLineup, type LineupRow } from "@/lib/lineup";
import { createClient } from "@/lib/supabase/server";
import {
  BEST_OF_THE_FEST,
  type AwardCategory,
  type CastMember,
} from "@/lib/types";

export default async function VotePage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const { guild: guildParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/vote");

  const festival = await getCurrentFestival(["AWARDS_VOTING"], guildParam);

  if (!festival) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow">The Ballot</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          Voting isn&apos;t open
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">
          The ballot appears once every film has screened and your president
          opens it. Until then,{" "}
          <Link href="/dashboard" className="underline hover:text-signal">
            your dashboard
          </Link>{" "}
          has the film that&apos;s on.
        </p>
      </main>
    );
  }

  const [{ data: awardRows }, { data: lineupRows }, { data: watchedRows }, { data: voteRows }] =
    await Promise.all([
      supabase
        .from("festival_awards")
        .select("award_id, name, tier, scoring")
        .eq("festival_id", festival.id),
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
        .from("votes")
        .select("award_id, tmdb_id, person")
        .eq("festival_id", festival.id)
        .eq("user_id", user.id),
    ]);

  // Announcement order: honorary first, Best of the Fest last.
  const awards = ceremonyOrder(
    (awardRows ?? []).map(
      (a): AwardCategory => ({
        id: a.award_id,
        name: a.name,
        tier: a.tier as AwardCategory["tier"],
        scoring: a.scoring,
      }),
    ),
  );
  const lineup = toLineup((lineupRows ?? []) as LineupRow[]);
  const initialBallot: Record<string, number> = {};
  const initialPerformers: Record<string, CastMember> = {};
  for (const v of voteRows ?? []) {
    initialBallot[v.award_id] = v.tmdb_id;
    if (v.person) initialPerformers[v.award_id] = v.person as CastMember;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">
          {festival.guildName} · Festival {festival.number} · {festival.theme}
        </p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          The Ballot
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
          One vote per category. {BEST_OF_THE_FEST} is the one that settles the
          festival — the rest are honorary, and announced first.
        </p>
      </header>

      <div className="mt-12">
        <Ballot
          festivalId={festival.id}
          awards={awards}
          lineup={lineup.map((l) => l.film)}
          watchedIds={(watchedRows ?? []).map((w) => w.tmdb_id)}
          initialBallot={initialBallot}
          initialPerformers={initialPerformers}
        />
      </div>
    </main>
  );
}
