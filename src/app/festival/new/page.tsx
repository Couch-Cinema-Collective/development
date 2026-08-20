import { redirect } from "next/navigation";

import { FestivalWizard } from "@/components/FestivalWizard";
import { getGuildHome } from "@/lib/guilds";
import { SEASON_CATEGORIES } from "@/lib/mock/categories";

/** Festival setup. President only — the guild page is the way in. */
export default async function NewFestivalPage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const { guild: guildId } = await searchParams;
  if (!guildId) redirect("/welcome");

  const guild = await getGuildHome(guildId);
  if (!guild) redirect("/welcome");
  if (guild.role !== "president") redirect(`/guild/${guildId}`);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">{guild.name} · President</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          Programme a Festival
        </h1>
      </header>

      <div className="mt-10">
        <FestivalWizard
          guildId={guild.id}
          guildName={guild.name}
          categories={SEASON_CATEGORIES}
          curatorCount={guild.curators.length}
        />
      </div>
    </main>
  );
}
