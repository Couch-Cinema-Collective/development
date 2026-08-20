import { redirect } from "next/navigation";

import { getUserMemberships } from "@/lib/guilds";
import { createClient } from "@/lib/supabase/server";
import type { AwardCredit, Film } from "@/lib/types";
import { DeleteAccount } from "@/components/DeleteAccount";

/**
 * The lifetime record (PLAN.md §1.3). Award credits are a count derived from
 * what actually won — every nominator of a winning film gets full credit.
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, created_at")
    .eq("id", user.id)
    .maybeSingle();
  const name =
    profile?.full_name ||
    (user.user_metadata.full_name as string | undefined) ||
    user.email ||
    "Member";

  // Finished seasons across the member's guilds.
  const guildIds = (await getUserMemberships()).map((m) => m.guildId);
  const { data: seasons } = guildIds.length
    ? await supabase
        .from("seasons")
        .select("id, number, guild_id")
        .in("guild_id", guildIds)
        .in("state", ["PUBLISHED", "ARCHIVED"])
    : { data: [] };
  const seasonById = new Map((seasons ?? []).map((s) => [s.id, s]));
  const seasonIds = [...seasonById.keys()];

  // Winners, my nominations, and film titles for those seasons.
  const [{ data: resultRows }, { data: myNominations }, { data: slateRows }] =
    seasonIds.length
      ? await Promise.all([
          supabase
            .from("award_results")
            .select("season_id, award_id, tmdb_id")
            .in("season_id", seasonIds),
          supabase
            .from("nominations")
            .select("season_id, tmdb_id")
            .in("season_id", seasonIds)
            .eq("user_id", user.id),
          supabase
            .from("slate_films")
            .select("season_id, tmdb_id, film")
            .in("season_id", seasonIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const { data: awardNames } = seasonIds.length
    ? await supabase
        .from("season_awards")
        .select("season_id, award_id, name")
        .in("season_id", seasonIds)
    : { data: [] };
  const awardName = new Map(
    (awardNames ?? []).map((a) => [`${a.season_id}:${a.award_id}`, a.name]),
  );
  const filmTitle = new Map(
    (slateRows ?? []).map((r) => [
      `${r.season_id}:${r.tmdb_id}`,
      (r.film as Film)?.title ?? "Unknown film",
    ]),
  );
  const myStakes = new Set(
    (myNominations ?? []).map((n) => `${n.season_id}:${n.tmdb_id}`),
  );

  // A credit for every winning film this member nominated (§1.3).
  const credits: AwardCredit[] = (resultRows ?? [])
    .filter((r) => myStakes.has(`${r.season_id}:${r.tmdb_id}`))
    .map((r) => ({
      awardId: r.award_id,
      awardName: awardName.get(`${r.season_id}:${r.award_id}`) ?? r.award_id,
      filmTitle: filmTitle.get(`${r.season_id}:${r.tmdb_id}`) ?? "Unknown film",
      seasonNumber: seasonById.get(r.season_id)?.number ?? 0,
    }));

  const grouped = new Map<number, AwardCredit[]>();
  for (const award of credits) {
    const bucket = grouped.get(award.seasonNumber) ?? [];
    bucket.push(award);
    grouped.set(award.seasonNumber, bucket);
  }
  const bySeason = [...grouped.entries()].sort((a, b) => b[0] - a[0]);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="pattern-signal-dark min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="border-b border-paper/20 pb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-paper/50">
            {memberSince ? `Member since ${memberSince}` : "Member"}
          </p>
          <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight text-paper">
            {name}
          </h1>

          <dl className="mt-8 flex gap-12">
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-paper/50">
                Awards
              </dt>
              <dd className="mt-1 text-3xl font-medium tabular-nums text-paper">
                {credits.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-paper/50">
                Seasons finished
              </dt>
              <dd className="mt-1 text-3xl font-medium tabular-nums text-paper">
                {seasonIds.length}
              </dd>
            </div>
          </dl>
        </header>

        {credits.length === 0 ? (
          <p className="mt-10 max-w-xl leading-relaxed text-paper/60">
            No award credits yet. They come from nominating films that go on to
            win — when a season you nominated in publishes its ceremony, your
            record grows here.
          </p>
        ) : (
          <div className="mt-10 space-y-12">
            {bySeason.map(([seasonNumber, awards]) => (
              <section key={seasonNumber}>
                <h2 className="border-b border-paper/20 pb-2 text-xs uppercase tracking-[0.18em] text-paper">
                  Season {seasonNumber}
                </h2>
                <ul className="mt-4 grid gap-3">
                  {awards.map((award) => (
                    <li
                      key={`${award.seasonNumber}-${award.awardId}`}
                      className="flex flex-wrap items-baseline gap-x-6 gap-y-1"
                    >
                      <span className="w-64 text-sm font-medium uppercase tracking-[0.06em] text-paper">
                        {award.awardName}
                      </span>
                      <span className="text-sm text-paper/60">
                        {award.filmTitle}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        <DeleteAccount />
      </div>
    </main>
  );
}
