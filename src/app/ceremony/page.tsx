import { Ceremony } from "@/components/Ceremony";
import { FIXTURE_FILMS } from "@/lib/mock/films";
import { GUILD, MEMBERS, SEASON } from "@/lib/mock/guild";
import { RESULTS, nominatorTally } from "@/lib/mock/results";
import { hydrateCatalog } from "@/lib/tmdb";

export default async function CeremonyPage() {
  const catalog = await hydrateCatalog(FIXTURE_FILMS);

  return (
    <Ceremony
      results={RESULTS}
      filmsById={Object.fromEntries(catalog.map((f) => [f.id, f]))}
      membersById={Object.fromEntries(MEMBERS.map((m) => [m.id, m]))}
      tally={nominatorTally(RESULTS)}
      seasonNumber={SEASON.number}
      seasonCategory={SEASON.category}
      guildName={GUILD.name}
    />
  );
}
