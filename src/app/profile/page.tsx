import { redirect } from "next/navigation";

import { DeleteAccount } from "@/components/DeleteAccount";
import { getUserMemberships } from "@/lib/guilds";
import { createClient } from "@/lib/supabase/server";
import {
  BEST_OF_THE_FEST,
  VOICE_OF_THE_PEOPLE,
  type AwardCredit,
  type Film,
} from "@/lib/types";

/**
 * The lifetime record.
 *
 * Two things are being tracked, and they are deliberately separate: festivals
 * won as a curator (Best of the Fest, the only award that scores) and upvotes
 * earned as a critic. Honorary awards are listed because they are fun, and
 * counted nowhere because they are not the game.
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

  // Finished festivals across the member's guilds.
  const guildIds = (await getUserMemberships())
    .filter((m) => m.status === "active")
    .map((m) => m.guildId);
  const { data: festivals } = guildIds.length
    ? await supabase
        .from("festivals")
        .select("id, number, theme, guild_id")
        .in("guild_id", guildIds)
        .in("state", ["CEREMONY", "ARCHIVED"])
    : { data: [] };
  const festivalById = new Map((festivals ?? []).map((f) => [f.id, f]));
  const festivalIds = [...festivalById.keys()];

  // Awards won by films this member put up, plus the titles to name them.
  const [{ data: myWins }, { data: lineupRows }, { data: awardNames }] =
    festivalIds.length
      ? await Promise.all([
          supabase
            .from("award_results")
            .select("festival_id, award_id, tmdb_id")
            .in("festival_id", festivalIds)
            .eq("curator_id", user.id),
          supabase
            .from("lineup_films")
            .select("festival_id, tmdb_id, film")
            .in("festival_id", festivalIds),
          supabase
            .from("festival_awards")
            .select("festival_id, award_id, name, scoring")
            .in("festival_id", festivalIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const awardMeta = new Map(
    (awardNames ?? []).map((a) => [
      `${a.festival_id}:${a.award_id}`,
      { name: a.name, scoring: a.scoring as boolean },
    ]),
  );
  const filmTitle = new Map(
    (lineupRows ?? []).map((r) => [
      `${r.festival_id}:${r.tmdb_id}`,
      (r.film as Film)?.title ?? "Unknown film",
    ]),
  );

  const credits: AwardCredit[] = (myWins ?? []).map((r) => {
    const meta = awardMeta.get(`${r.festival_id}:${r.award_id}`);
    return {
      awardId: r.award_id,
      awardName: meta?.name ?? r.award_id,
      filmTitle: filmTitle.get(`${r.festival_id}:${r.tmdb_id}`) ?? "Unknown film",
      festivalNumber: festivalById.get(r.festival_id)?.number ?? 0,
      scoring: meta?.scoring ?? false,
    };
  });

  const festivalsWon = credits.filter((c) => c.scoring).length;

  // Upvotes earned as a critic, across every finished festival.
  const standings = await Promise.all(
    festivalIds.map(async (id) => {
      const { data } = await supabase.rpc("critic_standings", { fid: id });
      const rows = (data ?? []) as { user_id: string; upvotes: number }[];
      const mine = rows.find((r) => r.user_id === user.id);
      return {
        upvotes: Number(mine?.upvotes ?? 0),
        // A win is topping the table, not merely appearing in it.
        wonVoice: rows[0]?.user_id === user.id && Number(rows[0].upvotes) > 0,
      };
    }),
  );
  const upvotesEarned = standings.reduce((sum, s) => sum + s.upvotes, 0);
  const voiceWins = standings.filter((s) => s.wonVoice).length;

  const grouped = new Map<number, AwardCredit[]>();
  for (const award of credits) {
    const bucket = grouped.get(award.festivalNumber) ?? [];
    bucket.push(award);
    grouped.set(award.festivalNumber, bucket);
  }
  const byFestival = [...grouped.entries()].sort((a, b) => b[0] - a[0]);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const stats = [
    { label: "Festivals won", value: festivalsWon },
    { label: VOICE_OF_THE_PEOPLE, value: voiceWins },
    { label: "Upvotes earned", value: upvotesEarned },
    { label: "Festivals finished", value: festivalIds.length },
  ];

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

          <dl className="mt-8 grid grid-cols-2 gap-8 sm:flex sm:gap-12">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-xs uppercase tracking-[0.18em] text-paper/50">
                  {s.label}
                </dt>
                <dd className="mt-1 text-3xl font-medium tabular-nums text-paper">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        {credits.length === 0 ? (
          <p className="mt-10 max-w-xl leading-relaxed text-paper/60">
            No awards yet. They come from putting up a film that goes on to win
            — when a festival you curated in publishes its ceremony, your record
            grows here.
          </p>
        ) : (
          <div className="mt-10 space-y-12">
            {byFestival.map(([festivalNumber, awards]) => (
              <section key={festivalNumber}>
                <h2 className="border-b border-paper/20 pb-2 text-xs uppercase tracking-[0.18em] text-paper">
                  Festival {festivalNumber}
                </h2>
                <ul className="mt-4 grid gap-3">
                  {awards
                    // The one that counts leads its festival.
                    .sort((a, b) => Number(b.scoring) - Number(a.scoring))
                    .map((award) => (
                      <li
                        key={`${award.festivalNumber}-${award.awardId}`}
                        className="flex flex-wrap items-baseline gap-x-6 gap-y-1"
                      >
                        <span
                          className={`w-64 text-sm font-medium uppercase tracking-[0.06em] ${
                            award.scoring ? "text-signal" : "text-paper"
                          }`}
                        >
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
            <p className="text-xs leading-relaxed text-paper/40">
              {BEST_OF_THE_FEST} is shown in red — it is the only award that
              counts toward festivals won. The rest are honours.
            </p>
          </div>
        )}
        <DeleteAccount />
      </div>
    </main>
  );
}
