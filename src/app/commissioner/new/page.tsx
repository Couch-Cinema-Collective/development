import Link from "next/link";
import { redirect } from "next/navigation";

import { SeasonWizard } from "@/components/SeasonWizard";
import { getUserMemberships } from "@/lib/guilds";
import { FIXTURE_FILMS } from "@/lib/mock/films";
import { hydrateCatalog } from "@/lib/tmdb";

export default async function NewSeasonPage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const { guild: guildParam } = await searchParams;

  const commissionerOf = (await getUserMemberships()).filter(
    (m) => m.role === "commissioner",
  );
  // Only commissioners open seasons; members get pointed at the fork.
  if (commissionerOf.length === 0) redirect("/welcome");

  const guild =
    commissionerOf.find((m) => m.guildId === guildParam) ??
    (commissionerOf.length === 1 ? commissionerOf[0] : null);

  // Commissioner of several guilds and no ?guild= — ask which one.
  if (!guild) {
    return (
      <main className="pattern-signal-dark min-h-screen">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <header className="border-b border-paper/20 pb-8">
            <p className="text-xs uppercase tracking-[0.18em] text-paper/50">
              President
            </p>
            <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight text-paper">
              New Season
            </h1>
          </header>
          <p className="mt-8 text-xs uppercase tracking-[0.18em] text-paper/50">
            For which guild?
          </p>
          <ul className="mt-4 grid gap-px border border-paper/20 bg-paper/20">
            {commissionerOf.map((m) => (
              <li key={m.guildId} className="bg-paper-raised">
                <Link
                  href={`/commissioner/new?guild=${m.guildId}`}
                  className="block px-6 py-5 text-xl font-medium uppercase tracking-tight transition-colors hover:bg-paper"
                >
                  {m.guildName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  // Needed for the weighting preview, which ranks a real pool of films.
  const catalog = await hydrateCatalog(FIXTURE_FILMS);

  return (
    <main className="pattern-signal-dark min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="border-b border-paper/20 pb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-paper/50">
            President · {guild.guildName}
          </p>
          <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight text-paper">
            New Season
          </h1>
        </header>

        <div className="mt-12 border border-ink bg-paper-raised p-8">
          <SeasonWizard
            catalog={catalog}
            guildId={guild.guildId}
            guildName={guild.guildName}
          />
        </div>
      </div>
    </main>
  );
}
