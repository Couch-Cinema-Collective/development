import { NextResponse } from "next/server";

import { notifyMembers } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Film } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOUR = 3_600_000;

type Nudge = {
  festivalId: string;
  tmdbId: number;
  kind: "watch" | "review" | "vote" | "missed" | "ballot";
  userIds: string[];
  title: string;
  body: string;
  path: string;
};

/**
 * The guilt-trip engine (FESTIVAL-SPEC.md): scheduled nudges against the
 * weekly clock, each sent exactly once per member per film per failing —
 * nudge_log's primary key is the guarantee. Runs every few hours via
 * Vercel Cron; quiet whenever there is nothing to feel guilty about.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const nudges: Nudge[] = [];

  // ── The weekly loop: films approaching a deadline, or just past one ──────
  const { data: screenings } = await admin
    .from("festivals")
    .select("id, guild_id, state, awards_close_at")
    .in("state", ["SCREENING", "AWARDS_VOTING"]);

  for (const festival of screenings ?? []) {
    const { data: members } = await admin
      .from("guild_members")
      .select("user_id")
      .eq("guild_id", festival.guild_id)
      .eq("status", "active");
    const everyone = (members ?? []).map((m) => m.user_id);
    if (everyone.length === 0) continue;

    if (festival.state === "SCREENING") {
      const { data: films } = await admin
        .from("lineup_films")
        .select("tmdb_id, film, viewing_starts_at, voting_starts_at, closes_at")
        .eq("festival_id", festival.id)
        .not("voting_starts_at", "is", null);

      for (const f of films ?? []) {
        const title = ((f.film as Film)?.title as string) ?? "this week's film";
        const lockAt = Date.parse(f.voting_starts_at);
        const closeAt = Date.parse(f.closes_at);
        const opened = Date.parse(f.viewing_starts_at) <= now;
        if (!opened) continue;

        const [{ data: watchedRows }, { data: reviewRows }] =
          await Promise.all([
            admin
              .from("watch_records")
              .select("user_id, watched_at")
              .eq("festival_id", festival.id)
              .eq("tmdb_id", f.tmdb_id),
            admin
              .from("reviews")
              .select("user_id")
              .eq("festival_id", festival.id)
              .eq("tmdb_id", f.tmdb_id),
          ]);
        const watchedInTime = new Set(
          (watchedRows ?? [])
            .filter((w) => Date.parse(w.watched_at) < lockAt)
            .map((w) => w.user_id),
        );
        const reviewed = new Set((reviewRows ?? []).map((r) => r.user_id));

        // Sunday looms: not watched yet.
        if (now < lockAt && lockAt - now < 36 * HOUR) {
          nudges.push({
            festivalId: festival.id,
            tmdbId: f.tmdb_id,
            kind: "watch",
            userIds: everyone.filter((u) => !watchedInTime.has(u)),
            title: "Reviews lock Sunday midnight",
            body: `${title} isn't marked watched. Miss it and you can't win this festival.`,
            path: "/dashboard",
          });
          // Watched but silent: no review filed.
          nudges.push({
            festivalId: festival.id,
            tmdbId: f.tmdb_id,
            kind: "review",
            userIds: everyone.filter(
              (u) => watchedInTime.has(u) && !reviewed.has(u),
            ),
            title: "Your review isn't in",
            body: `You watched ${title} and wrote nothing? 200 characters. Sunday midnight.`,
            path: "/dashboard",
          });
        }

        // Voting window closing: upvotes unspent.
        if (now >= lockAt && now < closeAt && closeAt - now < 24 * HOUR) {
          const { data: voteRows } = await admin
            .from("review_votes")
            .select("user_id, review_id, reviews!inner(festival_id, tmdb_id)")
            .eq("reviews.festival_id", festival.id)
            .eq("reviews.tmdb_id", f.tmdb_id);
          const spentBy = new Map<string, number>();
          for (const v of voteRows ?? []) {
            spentBy.set(v.user_id, (spentBy.get(v.user_id) ?? 0) + 1);
          }
          nudges.push({
            festivalId: festival.id,
            tmdbId: f.tmdb_id,
            kind: "vote",
            userIds: everyone.filter((u) => (spentBy.get(u) ?? 0) < 6),
            title: "Votes on the table",
            body: `Upvoting on ${title} closes tonight — spend all six or your own review drops out.`,
            path: "/dashboard",
          });
        }

        // The window shut without them. Say so.
        if (now >= lockAt && now - lockAt < 48 * HOUR) {
          nudges.push({
            festivalId: festival.id,
            tmdbId: f.tmdb_id,
            kind: "missed",
            userIds: everyone.filter((u) => !watchedInTime.has(u)),
            title: "The guild watched without you",
            body: `${title} closed and you never marked it watched. The film stays. Your shot at winning doesn't.`,
            path: "/dashboard",
          });
        }
      }
    }

    // ── The final ballot: three days, and some ballots sit empty ───────────
    if (festival.state === "AWARDS_VOTING" && festival.awards_close_at) {
      const closeAt = Date.parse(festival.awards_close_at);
      if (now < closeAt && closeAt - now < 24 * HOUR) {
        const [{ data: awardRows }, { data: ballotRows }] = await Promise.all([
          admin
            .from("festival_awards")
            .select("award_id")
            .eq("festival_id", festival.id),
          admin
            .from("votes")
            .select("user_id")
            .eq("festival_id", festival.id),
        ]);
        const expected = (awardRows ?? []).length + 1; // + Best Review
        const castBy = new Map<string, number>();
        for (const v of ballotRows ?? []) {
          castBy.set(v.user_id, (castBy.get(v.user_id) ?? 0) + 1);
        }
        nudges.push({
          festivalId: festival.id,
          tmdbId: 0,
          kind: "ballot",
          userIds: everyone.filter((u) => (castBy.get(u) ?? 0) < expected),
          title: "The ballot closes tomorrow",
          body: "Categories are sitting empty on your festival ballot. The ceremony won't wait.",
          path: "/vote",
        });
      }
    }
  }

  // ── Send each nudge once, ever — the log's key does the remembering ──────
  let sent = 0;
  for (const nudge of nudges) {
    if (nudge.userIds.length === 0) continue;
    const { data: fresh } = await admin
      .from("nudge_log")
      .upsert(
        nudge.userIds.map((userId) => ({
          festival_id: nudge.festivalId,
          tmdb_id: nudge.tmdbId,
          user_id: userId,
          kind: nudge.kind,
        })),
        {
          onConflict: "festival_id,tmdb_id,user_id,kind",
          ignoreDuplicates: true,
        },
      )
      .select("user_id");
    const recipients = (fresh ?? []).map((r) => r.user_id);
    if (recipients.length === 0) continue;
    const result = await notifyMembers(recipients, {
      title: nudge.title,
      body: nudge.body,
      path: nudge.path,
    });
    sent += result.sent;
  }

  return NextResponse.json({ ok: true, nudges: nudges.length, sent });
}
