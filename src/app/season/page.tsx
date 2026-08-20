import Link from "next/link";
import { redirect } from "next/navigation";

import { SeasonRoom, type RoomReview } from "@/components/SeasonRoom";
import { getUserMemberships } from "@/lib/guilds";
import { createClient } from "@/lib/supabase/server";
import type { Film } from "@/lib/types";

/** States in which the room is open. Watch toggles close at VOTING. */
const ROOM_STATES = ["SLATE_LOCKED", "WATCHING", "VOTING"];

/** The in-season room: what a member does between the draft and the ballot. */
export default async function InSeasonPage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const { guild: guildParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/season");

  const memberships = await getUserMemberships();
  const guildIds = memberships.map((m) => m.guildId);
  const { data: active } = guildIds.length
    ? await supabase
        .from("seasons")
        .select("id, guild_id, number, category, state")
        .in("guild_id", guildIds)
        .in("state", ROOM_STATES)
    : { data: [] };

  const season =
    (active ?? []).find((s) => s.guild_id === guildParam) ?? (active ?? [])[0];

  if (!season) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow">In Season</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          No slate yet
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">
          The season room opens once a slate is locked. If your guild is still
          nominating,{" "}
          <Link href="/draft" className="underline hover:text-signal">
            the draft
          </Link>{" "}
          is where the action is; otherwise check{" "}
          <Link href="/welcome" className="underline hover:text-signal">
            your guilds
          </Link>
          .
        </p>
      </main>
    );
  }

  const guildName =
    memberships.find((m) => m.guildId === season.guild_id)?.guildName ?? "";

  const [{ data: slateRows }, { data: watchedRows }, { data: reviewRows }] =
    await Promise.all([
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
        .from("reviews")
        .select("id, tmdb_id, user_id, rating, body, created_at")
        .eq("season_id", season.id)
        .order("created_at"),
    ]);

  const slate = (slateRows ?? []).map((r) => r.film as Film);

  // Reviewer names — guild_members FKs auth.users, so no PostgREST embed.
  const reviewerIds = [...new Set((reviewRows ?? []).map((r) => r.user_id))];
  const { data: profiles } = reviewerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  // Upvotes, counted from the rows rather than a stored tally.
  const reviewIds = (reviewRows ?? []).map((r) => r.id);
  const { data: voteRows } = reviewIds.length
    ? await supabase
        .from("review_votes")
        .select("review_id, user_id")
        .in("review_id", reviewIds)
    : { data: [] };

  const upvoteCount = new Map<string, number>();
  const upvotedByMe = new Set<string>();
  for (const v of voteRows ?? []) {
    upvoteCount.set(v.review_id, (upvoteCount.get(v.review_id) ?? 0) + 1);
    if (v.user_id === user.id) upvotedByMe.add(v.review_id);
  }

  const reviews: RoomReview[] = (reviewRows ?? []).map((r) => ({
    id: r.id,
    tmdbId: r.tmdb_id,
    userId: r.user_id,
    memberName: nameById.get(r.user_id) || "Member",
    rating: Number(r.rating),
    body: r.body,
    upvotes: upvoteCount.get(r.id) ?? 0,
    upvotedByMe: upvotedByMe.has(r.id),
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">
          {guildName} · Season {season.number} · {season.category}
        </p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          In Season
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
          Watch on your own time. Mark films off as you go, write them up, and
          see what the rest of the guild made of them.
        </p>
      </header>

      <div className="mt-12">
        <SeasonRoom
          seasonId={season.id}
          slate={slate}
          reviews={reviews}
          myUserId={user.id}
          initiallyWatched={(watchedRows ?? []).map((w) => w.tmdb_id)}
          checklistOpen={season.state !== "VOTING"}
        />
      </div>
    </main>
  );
}
