import Link from "next/link";
import { redirect } from "next/navigation";

import { Countdown } from "@/components/Countdown";
import { DraftBoard } from "@/components/DraftBoard";
import { getUserMemberships } from "@/lib/guilds";
import { toPoolRow, type PoolRpcRow } from "@/lib/nominations";
import { createClient } from "@/lib/supabase/server";
import { catalogForCategory, isLive } from "@/lib/tmdb";
import type { Film } from "@/lib/types";

export default async function DraftPage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const { guild: guildParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/draft");

  // Every guild the member belongs to that is currently nominating.
  const memberships = await getUserMemberships();
  const guildIds = memberships.map((m) => m.guildId);
  const { data: nominating } = guildIds.length
    ? await supabase
        .from("seasons")
        .select(
          "id, guild_id, number, category, state, film_count, nomination_deadline, w_guild, w_critic",
        )
        .in("guild_id", guildIds)
        .eq("state", "NOMINATING")
    : { data: [] };

  const season =
    (nominating ?? []).find((s) => s.guild_id === guildParam) ??
    (nominating ?? [])[0];

  if (!season) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow">The Draft</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          Nothing to nominate
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">
          None of your guilds has a season in its nomination window right now.
          {memberships.length === 0 ? (
            <>
              {" "}
              <Link href="/welcome" className="underline hover:text-signal">
                Found or join a guild
              </Link>{" "}
              to get started.
            </>
          ) : (
            " When your guild president opens one, the draft happens here."
          )}
        </p>
      </main>
    );
  }

  const guildName =
    memberships.find((m) => m.guildId === season.guild_id)?.guildName ?? "";

  // My saved stakes (RLS: during NOMINATING only own rows are visible) and
  // the anonymized live pool, in parallel with the browse catalog.
  const [{ data: mine }, { data: poolRows }, catalog] = await Promise.all([
    supabase
      .from("nominations")
      .select("tmdb_id, points, film")
      .eq("season_id", season.id)
      .eq("user_id", user.id),
    supabase.rpc("nomination_pool", { sid: season.id }),
    catalogForCategory(season.category),
  ]);

  const initialAllocations: Record<number, number> = {};
  const myFilms: Film[] = [];
  for (const row of mine ?? []) {
    initialAllocations[row.tmdb_id] = row.points;
    if (row.film) myFilms.push(row.film as Film);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-8 border-b border-rule pb-8">
        <div>
          <p className="label-eyebrow">
            {guildName} · Season {season.number} · {season.category}
          </p>
          <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
            The Draft
          </h1>
        </div>

        {season.nomination_deadline && (
          <div className="text-right">
            <p className="label-eyebrow">Nominations lock in</p>
            <div className="mt-2">
              <Countdown deadline={season.nomination_deadline} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-12">
        <DraftBoard
          seasonId={season.id}
          filmCount={season.film_count}
          weights={{
            guild: Number(season.w_guild),
            critic: Number(season.w_critic),
          }}
          catalog={catalog}
          myFilms={myFilms}
          initialAllocations={initialAllocations}
          initialPool={((poolRows ?? []) as PoolRpcRow[]).map(toPoolRow)}
          live={isLive()}
          categoryName={season.category}
        />
      </div>
    </main>
  );
}
