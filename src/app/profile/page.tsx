import { notFound } from "next/navigation";

import { CURRENT_MEMBER_ID, MEMBERS_BY_ID } from "@/lib/mock/guild";
import type { AwardCredit } from "@/lib/types";

/**
 * The lifetime record (PLAN.md §1.3). Award credits are a count derived from
 * what actually won — there is no separate points currency.
 */
export default function ProfilePage() {
  const member = MEMBERS_BY_ID.get(CURRENT_MEMBER_ID);
  if (!member) notFound();

  const grouped = new Map<number, AwardCredit[]>();
  for (const award of member.awards) {
    const bucket = grouped.get(award.seasonNumber) ?? [];
    bucket.push(award);
    grouped.set(award.seasonNumber, bucket);
  }
  const bySeason = [...grouped.entries()].sort((a, b) => b[0] - a[0]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">Member since Season 1</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          {member.name}
        </h1>

        <dl className="mt-8 flex gap-12">
          <div>
            <dt className="label-eyebrow">Awards</dt>
            <dd className="mt-1 text-3xl font-medium tabular-nums">
              {member.awards.length}
            </dd>
          </div>
          <div>
            <dt className="label-eyebrow">Seasons</dt>
            <dd className="mt-1 text-3xl font-medium tabular-nums">
              {member.seasonsPlayed}
            </dd>
          </div>
        </dl>
      </header>

      <section className="mt-12">
        <h2 className="label-eyebrow">The record</h2>

        {bySeason.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">
            No awards yet. Nominate well.
          </p>
        ) : (
          <div className="mt-6 space-y-10">
            {bySeason.map(([season, awards]) => (
              <div key={season}>
                <p className="label-eyebrow text-signal">Season {season}</p>
                <ul className="mt-3 border-t border-rule">
                  {awards.map((award) => (
                    <li
                      key={`${award.awardId}-${award.filmTitle}`}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule py-4"
                    >
                      <span className="text-sm uppercase tracking-[0.08em]">
                        {award.awardName}
                      </span>
                      <span className="text-sm text-ink-soft">
                        {award.filmTitle}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 max-w-lg text-xs leading-relaxed text-ink-faint">
          You are credited with an award when a film you nominated wins it. Every
          nominator of a winning film receives full credit, regardless of how many
          points they staked.
        </p>
      </section>
    </main>
  );
}
