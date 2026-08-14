import { SeasonRoom } from "@/components/SeasonRoom";
import { FIXTURE_FILMS } from "@/lib/mock/films";
import {
  CURRENT_MEMBER_ID,
  GUILD,
  MEMBERS,
  SEASON,
  SLATE_FILM_IDS,
} from "@/lib/mock/guild";
import { REVIEWS, WATCH_RECORDS } from "@/lib/mock/reviews";
import { scoresFor } from "@/lib/scores";
import { hydrateCatalog } from "@/lib/tmdb";

/** The in-season room: what a member does between the draft and the ballot. */
export default async function InSeasonPage() {
  const catalog = await hydrateCatalog(FIXTURE_FILMS);
  const byId = new Map(catalog.map((f) => [f.id, f]));
  const baseSlate = SLATE_FILM_IDS.flatMap((id) => {
    const film = byId.get(id);
    return film ? [film] : [];
  });

  // IMDb / Rotten Tomatoes / Metacritic, when the provider is configured.
  const scores = await scoresFor(baseSlate.map((f) => f.imdbId));
  const slate = baseSlate.map((film) => ({
    ...film,
    externalScores: film.imdbId ? scores[film.imdbId] : undefined,
  }));

  const membersById = Object.fromEntries(MEMBERS.map((m) => [m.id, m]));
  const initiallyWatched = WATCH_RECORDS.filter(
    (w) => w.memberId === CURRENT_MEMBER_ID,
  ).map((w) => w.filmId);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">
          {GUILD.name} · Season {SEASON.number} · {SEASON.category}
        </p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          In Season
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
          Watch on your own time. Mark films off as you go, write them up, and see
          what the rest of the guild made of them.
        </p>
      </header>

      <div className="mt-12">
        <SeasonRoom
          slate={slate}
          reviews={REVIEWS}
          membersById={membersById}
          currentMemberId={CURRENT_MEMBER_ID}
          initiallyWatched={initiallyWatched}
        />
      </div>
    </main>
  );
}
