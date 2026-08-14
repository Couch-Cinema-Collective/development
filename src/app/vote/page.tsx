import Link from "next/link";
import { redirect } from "next/navigation";

import { Ballot } from "@/components/Ballot";
import { getUserMemberships } from "@/lib/guilds";
import { ceremonyOrder } from "@/lib/mock/awards";
import { createClient } from "@/lib/supabase/server";
import type { AwardCategory, Film } from "@/lib/types";

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

  const memberships = await getUserMemberships();
  const guildIds = memberships.map((m) => m.guildId);
  const { data: voting } = guildIds.length
    ? await supabase
        .from("seasons")
        .select("id, guild_id, number, category, eligibility")
        .in("guild_id", guildIds)
        .eq("state", "VOTING")
    : { data: [] };

  const season =
    (voting ?? []).find((s) => s.guild_id === guildParam) ?? (voting ?? [])[0];

  if (!season) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow">The Ballot</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          Voting isn&apos;t open
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">
          The ballot appears when your commissioner opens voting. Until then,{" "}
          <Link href="/season" className="underline hover:text-signal">
            the season room
          </Link>{" "}
          is where to catch up on the slate.
        </p>
      </main>
    );
  }

  const guildName =
    memberships.find((m) => m.guildId === season.guild_id)?.guildName ?? "";

  const [{ data: awardRows }, { data: slateRows }, { data: watchedRows }, { data: voteRows }] =
    await Promise.all([
      supabase
        .from("season_awards")
        .select("award_id, name, tier")
        .eq("season_id", season.id),
      supabase
        .from("slate_films")
        .select("tmdb_id, film")
        .eq("season_id", season.id),
      supabase
        .from("watch_records")
        .select("tmdb_id")
        .eq("season_id", season.id)
        .eq("user_id", user.id),
      supabase
        .from("votes")
        .select("award_id, tmdb_id")
        .eq("season_id", season.id)
        .eq("user_id", user.id),
    ]);

  // Announcement order: craft first, Best Picture last (§4C).
  const awards = ceremonyOrder(
    (awardRows ?? []).map(
      (a): AwardCategory => ({
        id: a.award_id,
        name: a.name,
        tier: a.tier as AwardCategory["tier"],
      }),
    ),
  );
  const slate = (slateRows ?? []).map((r) => r.film as Film);
  const initialBallot: Record<string, number> = {};
  for (const v of voteRows ?? []) initialBallot[v.award_id] = v.tmdb_id;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">
          {guildName} · Season {season.number} · {season.category}
        </p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          The Ballot
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
          One vote per category. Announcement order follows the Oscars — craft
          first, Best Picture last.
        </p>
      </header>

      <div className="mt-12">
        <Ballot
          seasonId={season.id}
          awards={awards}
          slate={slate}
          watchedIds={(watchedRows ?? []).map((w) => w.tmdb_id)}
          initialBallot={initialBallot}
          honorGate={season.eligibility === "honor"}
        />
      </div>
    </main>
  );
}
