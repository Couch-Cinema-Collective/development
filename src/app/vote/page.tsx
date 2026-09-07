import Link from "next/link";
import { redirect } from "next/navigation";

import { Ballot } from "@/components/Ballot";
import { getCurrentFestival } from "@/lib/guilds";
import { Countdown } from "@/components/Countdown";
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

  const [
    { data: awardRows },
    { data: lineupRows },
    { data: watchedRows },
    { data: voteRows },
    { data: candidateRows },
    { data: festivalRow },
  ] = await Promise.all([
      supabase
        .from("festival_awards")
        .select("award_id, name, tier, scoring, nominees")
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
        .select("award_id, tmdb_id, person, review_id")
        .eq("festival_id", festival.id)
        .eq("user_id", user.id),
      supabase.rpc("best_review_candidates", { fid: festival.id }),
      supabase
        .from("festivals")
        .select("awards_close_at")
        .eq("id", festival.id)
        .maybeSingle(),
    ]);

  // Announcement order: honorary first, Best of the Fest last.
  const awards = ceremonyOrder(
    (awardRows ?? []).map(
      (a): AwardCategory => ({
        id: a.award_id,
        name: a.name,
        tier: a.tier as AwardCategory["tier"],
        scoring: a.scoring,
        nominees: (a.nominees ?? []) as AwardCategory["nominees"],
      }),
    ),
  );
  const lineup = toLineup((lineupRows ?? []) as LineupRow[]);

  // The Best Review shortlist — authors are revealed (every film has closed
  // by the time the ballot opens), so name them.
  type CandidateRow = {
    review_id: string;
    user_id: string;
    tmdb_id: number;
    body: string;
    upvotes: number;
  };
  const candidates = (candidateRows ?? []) as CandidateRow[];
  const authorIds = [...new Set(candidates.map((c) => c.user_id))];
  const { data: authorProfiles } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const authorById = new Map(
    (authorProfiles ?? []).map((a) => [a.id, a.full_name || "Member"]),
  );
  const titleByFilm = new Map(
    lineup.map((l) => [l.film.id, l.film.title as string]),
  );
  const reviewCandidates = candidates.map((c) => ({
    reviewId: c.review_id,
    tmdbId: c.tmdb_id,
    filmTitle: titleByFilm.get(c.tmdb_id) ?? "",
    authorName: authorById.get(c.user_id) ?? "Member",
    body: c.body,
    upvotes: Number(c.upvotes),
  }));
  const initialReviewId =
    (voteRows ?? []).find((v) => v.award_id === "best-review")?.review_id ??
    null;
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
        {festivalRow?.awards_close_at && (
          <div className="mt-5">
            <p className="label-eyebrow">Ballots close in</p>
            <div className="mt-1.5">
              <Countdown
                deadline={festivalRow.awards_close_at}
                expiredLabel="Ballots closed"
                size="small"
              />
            </div>
          </div>
        )}
      </header>

      <div className="mt-12">
        <Ballot
          festivalId={festival.id}
          awards={awards}
          lineup={lineup.map((l) => l.film)}
          watchedIds={(watchedRows ?? []).map((w) => w.tmdb_id)}
          initialBallot={initialBallot}
          initialPerformers={initialPerformers}
          reviewCandidates={reviewCandidates}
          initialReviewId={initialReviewId}
        />
      </div>
    </main>
  );
}
