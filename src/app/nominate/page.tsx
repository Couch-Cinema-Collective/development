import Link from "next/link";
import { redirect } from "next/navigation";

import { Countdown } from "@/components/Countdown";
import { NominationPicker } from "@/components/NominationPicker";
import { getCurrentFestival } from "@/lib/guilds";
import { createClient } from "@/lib/supabase/server";
import { catalogForCategory, isLive } from "@/lib/tmdb";
import { isCurator, type Film, type GuildRole } from "@/lib/types";

/** Where a curator puts their one film up (PLAN.md §1.1). */
export default async function NominatePage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string }>;
}) {
  const { guild: guildParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/nominate");

  const festival = await getCurrentFestival(["NOMINATING"], guildParam);

  if (!festival) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow">Nominations</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          Nothing to programme
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">
          None of your guilds is taking nominations right now. When your
          president opens a festival, this is where you put your film up —{" "}
          <Link href="/welcome" className="underline hover:text-signal">
            your guilds
          </Link>{" "}
          in the meantime.
        </p>
      </main>
    );
  }

  const { data: membership } = await supabase
    .from("guild_members")
    .select("role, status")
    .eq("guild_id", festival.guildId)
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (membership?.role ?? "critic") as GuildRole;

  // Critics vote but do not programme — say so plainly rather than showing a
  // picker that Postgres would reject.
  if (!isCurator(role)) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow">
          {festival.guildName} · Festival {festival.number}
        </p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          Curators are programming
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">
          {festival.theme} is being put together now. You&apos;re a critic on
          this one, so your part starts when the first film opens — watching,
          reviewing, and voting on every title in the lineup.
        </p>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
          Want a curator seat next time?{" "}
          <Link
            href={`/guild/${festival.guildId}`}
            className="underline hover:text-signal"
          >
            Ask your president
          </Link>
          .
        </p>
      </main>
    );
  }

  const [{ data: mine }, { data: countRow }, catalog] = await Promise.all([
    supabase
      .from("nominations")
      .select("tmdb_id, film")
      .eq("festival_id", festival.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("nomination_count", { fid: festival.id }).maybeSingle(),
    catalogForCategory(festival.theme),
  ]);

  const counts = countRow as { submitted: number; expected: number } | null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-8 border-b border-rule pb-8">
        <div>
          <p className="label-eyebrow">
            {festival.guildName} · Festival {festival.number} · {festival.theme}
          </p>
          <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
            Your Nomination
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
            One film, chosen by you, screened by everyone. Pick the one you want
            to defend.
          </p>
        </div>

        {festival.nominationDeadline && (
          <div className="text-right">
            <p className="label-eyebrow">Nominations close in</p>
            <div className="mt-2">
              <Countdown
                deadline={festival.nominationDeadline}
                expiredLabel="Nominations closed"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-12">
        <NominationPicker
          festivalId={festival.id}
          theme={festival.theme}
          catalog={catalog}
          initialPick={(mine?.film as Film) ?? null}
          initialSubmitted={Number(counts?.submitted ?? 0)}
          expected={Number(counts?.expected ?? 0)}
          live={isLive()}
        />
      </div>
    </main>
  );
}
