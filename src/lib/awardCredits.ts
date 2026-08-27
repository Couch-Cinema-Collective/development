import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AwardCredit, Film } from "@/lib/types";

export interface CreditsSummary {
  credits: AwardCredit[];
  /** Best of the Fest only — the one award that scores. */
  festivalsWon: number;
  voiceWins: number;
  upvotesEarned: number;
  festivalsFinished: number;
}

const EMPTY: CreditsSummary = {
  credits: [],
  festivalsWon: 0,
  voiceWins: 0,
  upvotesEarned: 0,
  festivalsFinished: 0,
};

/**
 * A member's lifetime record: every award credit plus the derived counts
 * (festivals won, Voice of the People wins, upvotes earned, festivals
 * finished). Shared by the profile page (which lists the credits) and the
 * welcome page (which shows only the counts), so the two never drift apart.
 */
export async function getAwardCredits(
  userId: string,
  guildIds: string[],
): Promise<CreditsSummary> {
  if (!guildIds.length) return EMPTY;

  const supabase = await createClient();

  // Finished festivals across the member's guilds.
  const { data: festivals } = await supabase
    .from("festivals")
    .select("id, number, guild_id")
    .in("guild_id", guildIds)
    .in("state", ["CEREMONY", "ARCHIVED"]);
  const festivalById = new Map((festivals ?? []).map((f) => [f.id, f]));
  const festivalIds = [...festivalById.keys()];
  if (!festivalIds.length) return EMPTY;

  // Awards won by films this member put up, plus the titles to name them.
  const [{ data: myWins }, { data: lineupRows }, { data: awardNames }] =
    await Promise.all([
      supabase
        .from("award_results")
        .select("festival_id, award_id, tmdb_id")
        .in("festival_id", festivalIds)
        .eq("curator_id", userId),
      supabase
        .from("lineup_films")
        .select("festival_id, tmdb_id, film")
        .in("festival_id", festivalIds),
      supabase
        .from("festival_awards")
        .select("festival_id, award_id, name, scoring")
        .in("festival_id", festivalIds),
    ]);

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
      const mine = rows.find((r) => r.user_id === userId);
      return {
        upvotes: Number(mine?.upvotes ?? 0),
        // A win is topping the table, not merely appearing in it.
        wonVoice: rows[0]?.user_id === userId && Number(rows[0].upvotes) > 0,
      };
    }),
  );
  const upvotesEarned = standings.reduce((sum, s) => sum + s.upvotes, 0);
  const voiceWins = standings.filter((s) => s.wonVoice).length;

  return {
    credits,
    festivalsWon,
    voiceWins,
    upvotesEarned,
    festivalsFinished: festivalIds.length,
  };
}
