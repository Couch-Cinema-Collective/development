import { Ballot } from "@/components/Ballot";
import { FIXTURE_FILMS } from "@/lib/mock/films";
import { CURRENT_MEMBER_ID, GUILD, SEASON, SLATE_FILM_IDS } from "@/lib/mock/guild";
import { CEREMONY_AWARDS } from "@/lib/mock/results";
import { WATCH_RECORDS } from "@/lib/mock/reviews";
import { hydrateCatalog } from "@/lib/tmdb";

export default async function VotePage() {
  const catalog = await hydrateCatalog(FIXTURE_FILMS);
  const byId = new Map(catalog.map((f) => [f.id, f]));
  const slate = SLATE_FILM_IDS.flatMap((id) => {
    const film = byId.get(id);
    return film ? [film] : [];
  });

  const watchedIds = WATCH_RECORDS.filter(
    (w) => w.memberId === CURRENT_MEMBER_ID,
  ).map((w) => w.filmId);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">
          {GUILD.name} · Season {SEASON.number} · {SEASON.category}
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
        <Ballot awards={CEREMONY_AWARDS} slate={slate} watchedIds={watchedIds} />
      </div>
    </main>
  );
}
