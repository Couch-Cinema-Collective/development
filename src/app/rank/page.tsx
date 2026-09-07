import Link from "next/link";
import { redirect } from "next/navigation";

import { Countdown } from "@/components/Countdown";
import { RankBallot, type RankedFilm } from "@/components/RankBallot";
import { getCurrentFestival } from "@/lib/guilds";
import { createClient } from "@/lib/supabase/server";
import type { Film } from "@/lib/types";

/**
 * The rank-choice ballot, live only while a festival is narrowing more
 * nominations than it can screen (FESTIVAL-SPEC.md).
 */
export default async function RankPage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const { guild: guildParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/rank");

  const festival = await getCurrentFestival(["RANKING"], guildParam);

  if (!festival) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow">Rank choice</p>
        <h1 className="mt-3 text-4xl font-medium uppercase leading-none tracking-tight sm:text-5xl">
          Nothing to rank
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">
          No festival is narrowing its slate right now.{" "}
          <Link href="/welcome" className="underline hover:text-signal">
            Your guilds
          </Link>{" "}
          have the current state of play.
        </p>
      </main>
    );
  }

  const [{ data: gridRows }, { data: myBallot }, { data: festivalRow }] =
    await Promise.all([
      supabase.rpc("nomination_grid", { fid: festival.id }),
      supabase
        .from("rank_ballots")
        .select("tmdb_id, rank")
        .eq("festival_id", festival.id)
        .eq("user_id", user.id)
        .order("rank"),
      supabase
        .from("festivals")
        .select("ranking_closes_at")
        .eq("id", festival.id)
        .maybeSingle(),
    ]);

  type GridRow = {
    tmdb_id: number;
    film: Film;
    pitch: string;
    locked: boolean;
  };
  const candidates = ((gridRows ?? []) as GridRow[]).filter((r) => r.locked);

  // Present in the member's saved order first, then the unranked in claim
  // order — a returning member picks up where they left off.
  const savedOrder = new Map(
    (myBallot ?? []).map((b) => [b.tmdb_id, b.rank as number]),
  );
  const films: RankedFilm[] = candidates
    .map((r) => ({ tmdbId: r.tmdb_id, film: r.film, pitch: r.pitch }))
    .sort(
      (a, b) =>
        (savedOrder.get(a.tmdbId) ?? 999) - (savedOrder.get(b.tmdbId) ?? 999),
    );

  const closesAt = festivalRow?.ranking_closes_at ?? null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">
          {festival.guildName} · Festival {festival.number} · {festival.theme}
        </p>
        <h1 className="mt-3 text-4xl font-medium uppercase leading-none tracking-tight sm:text-5xl">
          Rank the slate
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
          {candidates.length} films were nominated and{" "}
          {festival.filmCount || "fewer"} will screen. Rank them all — when the
          window shuts, instant-runoff voting decides the lineup.
        </p>
        {closesAt && (
          <div className="mt-5">
            <p className="label-eyebrow">Ranking closes in</p>
            <div className="mt-2">
              <Countdown
                deadline={closesAt}
                expiredLabel="Ranking closed"
                size="small"
              />
            </div>
          </div>
        )}
      </header>

      <div className="mt-10">
        <RankBallot
          festivalId={festival.id}
          films={films}
          alreadySaved={(myBallot ?? []).length > 0}
        />
      </div>
    </main>
  );
}
