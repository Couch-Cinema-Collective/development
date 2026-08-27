import { redirect } from "next/navigation";

import { DeleteAccount } from "@/components/DeleteAccount";
import { getAwardCredits } from "@/lib/awardCredits";
import { getUserMemberships } from "@/lib/guilds";
import { createClient } from "@/lib/supabase/server";
import { BEST_OF_THE_FEST, VOICE_OF_THE_PEOPLE, type AwardCredit } from "@/lib/types";

/**
 * The lifetime record.
 *
 * Two things are being tracked, and they are deliberately separate: festivals
 * won as a curator (Best of the Fest, the only award that scores) and upvotes
 * earned as a critic. Honorary awards are listed because they are fun, and
 * counted nowhere because they are not the game.
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, created_at")
    .eq("id", user.id)
    .maybeSingle();
  const name =
    profile?.full_name ||
    (user.user_metadata.full_name as string | undefined) ||
    user.email ||
    "Member";

  const guildIds = (await getUserMemberships()).map((m) => m.guildId);
  const { credits, festivalsWon, voiceWins, upvotesEarned, festivalsFinished } =
    await getAwardCredits(user.id, guildIds);

  const grouped = new Map<number, AwardCredit[]>();
  for (const award of credits) {
    const bucket = grouped.get(award.festivalNumber) ?? [];
    bucket.push(award);
    grouped.set(award.festivalNumber, bucket);
  }
  const byFestival = [...grouped.entries()].sort((a, b) => b[0] - a[0]);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const stats = [
    { label: "Festivals won", value: festivalsWon },
    { label: VOICE_OF_THE_PEOPLE, value: voiceWins },
    { label: "Upvotes earned", value: upvotesEarned },
    { label: "Festivals finished", value: festivalsFinished },
  ];

  return (
    <main className="pattern-signal-dark min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="border-b border-paper/20 pb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-paper/50">
            {memberSince ? `Member since ${memberSince}` : "Member"}
          </p>
          <h1 className="mt-3 break-words text-4xl font-medium uppercase leading-none tracking-tight text-paper sm:text-5xl">
            {name}
          </h1>

          <dl className="mt-8 grid grid-cols-2 gap-8 sm:flex sm:gap-12">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-xs uppercase tracking-[0.18em] text-paper/50">
                  {s.label}
                </dt>
                <dd className="mt-1 text-3xl font-medium tabular-nums text-paper">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        {credits.length === 0 ? (
          <p className="mt-10 max-w-xl leading-relaxed text-paper/60">
            No awards yet. They come from putting up a film that goes on to win
            — when a festival you curated in publishes its ceremony, your record
            grows here.
          </p>
        ) : (
          <div className="mt-10 space-y-12">
            {byFestival.map(([festivalNumber, awards]) => (
              <section key={festivalNumber}>
                <h2 className="border-b border-paper/20 pb-2 text-xs uppercase tracking-[0.18em] text-paper">
                  Festival {festivalNumber}
                </h2>
                <ul className="mt-4 grid gap-3">
                  {awards
                    // The one that counts leads its festival.
                    .sort((a, b) => Number(b.scoring) - Number(a.scoring))
                    .map((award) => (
                      <li
                        key={`${award.festivalNumber}-${award.awardId}`}
                        className="flex flex-wrap items-baseline gap-x-6 gap-y-1"
                      >
                        <span
                          className={`w-64 text-sm font-medium uppercase tracking-[0.06em] ${
                            award.scoring ? "text-signal" : "text-paper"
                          }`}
                        >
                          {award.awardName}
                        </span>
                        <span className="text-sm text-paper/60">
                          {award.filmTitle}
                        </span>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
            <p className="text-xs leading-relaxed text-paper/40">
              {BEST_OF_THE_FEST} is shown in red — it is the only award that
              counts toward festivals won. The rest are honours.
            </p>
          </div>
        )}
        <DeleteAccount />
      </div>
    </main>
  );
}
