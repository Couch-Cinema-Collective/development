import { Countdown } from "@/components/Countdown";
import { DraftBoard } from "@/components/DraftBoard";
import { FIXTURE_FILMS } from "@/lib/mock/films";
import {
  CURRENT_MEMBER_ID,
  EXISTING_NOMINATIONS,
  GUILD,
  SEASON,
} from "@/lib/mock/guild";
import { hydrateCatalog, isLive } from "@/lib/tmdb";

export default async function DraftPage() {
  const catalog = await hydrateCatalog(FIXTURE_FILMS);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-8 border-b border-rule pb-8">
        <div>
          <p className="label-eyebrow">
            {GUILD.name} · Season {SEASON.number} · {SEASON.category}
          </p>
          <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
            The Draft
          </h1>
        </div>

        <div className="text-right">
          <p className="label-eyebrow">Nominations lock in</p>
          <div className="mt-2">
            <Countdown deadline={SEASON.nominationDeadline} />
          </div>
        </div>
      </div>

      <div className="mt-12">
        <DraftBoard
          season={SEASON}
          catalog={catalog}
          existingNominations={EXISTING_NOMINATIONS}
          currentMemberId={CURRENT_MEMBER_ID}
          live={isLive()}
        />
      </div>
    </main>
  );
}
