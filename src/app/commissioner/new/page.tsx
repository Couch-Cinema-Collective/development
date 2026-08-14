import { SeasonWizard } from "@/components/SeasonWizard";
import { FIXTURE_FILMS } from "@/lib/mock/films";
import { hydrateCatalog } from "@/lib/tmdb";

export default async function NewSeasonPage() {
  // Needed for the weighting preview, which ranks a real pool of films.
  const catalog = await hydrateCatalog(FIXTURE_FILMS);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">Commissioner</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          New Season
        </h1>
      </header>

      <div className="mt-12">
        <SeasonWizard catalog={catalog} />
      </div>
    </main>
  );
}
