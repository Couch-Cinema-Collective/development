import Link from "next/link";

import { GUILD, SEASON } from "@/lib/mock/guild";
import { MAX_GUILD_MEMBERS, type SeasonState } from "@/lib/types";

/** PLAN.md §2. The strip below is the member-facing view of this. */
const STATES: { state: SeasonState; label: string }[] = [
  { state: "NOMINATING", label: "Nominating" },
  { state: "TALLYING", label: "Tallying" },
  { state: "SLATE_LOCKED", label: "Slate" },
  { state: "WATCHING", label: "Watching" },
  { state: "VOTING", label: "Voting" },
  { state: "PUBLISHED", label: "Ceremony" },
];

export default function SeasonPage() {
  const currentIndex = STATES.findIndex((s) => s.state === SEASON.state);

  return (
    <main>
      <section className="pattern-signal">
        <div className="mx-auto max-w-7xl px-6 py-24 text-paper">
          <p className="label-eyebrow text-paper/70">
            {GUILD.name} · Season {SEASON.number}
          </p>
          <h1 className="mt-4 max-w-3xl text-balance text-7xl font-medium uppercase leading-[0.92] tracking-tight">
            {SEASON.category}
          </h1>
          <p className="mt-6 max-w-md text-paper/85">
            {SEASON.filmCount} films. {SEASON.awards.length} awards. Nominations
            are open — you have five points to spend.
          </p>

          <Link
            href="/draft"
            className="mt-10 inline-block bg-ink px-8 py-4 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-paper hover:text-ink"
          >
            Enter the draft
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="label-eyebrow">Season progress</h2>

        <ol className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-6">
          {STATES.map((step, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;

            return (
              <li
                key={step.state}
                className={`bg-paper-raised px-5 py-6 ${done ? "opacity-45" : ""}`}
              >
                <span className="label-eyebrow">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p
                  className={`mt-2 text-sm uppercase tracking-tight ${
                    active ? "font-medium text-signal" : ""
                  }`}
                >
                  {step.label}
                </p>
                {active && (
                  <span className="mt-3 block h-0.5 w-8 bg-signal" />
                )}
              </li>
            );
          })}
        </ol>

        <dl className="mt-16 grid gap-px border border-rule bg-rule sm:grid-cols-3">
          <Stat label="Guild" value={GUILD.name} />
          <Stat
            label="Members"
            value={`${GUILD.members.length} / ${MAX_GUILD_MEMBERS}`}
            note="Hard cap — larger guilds dilute nominations."
          />
          <Stat
            label="Slate weighting"
            value={`${SEASON.weights.guild * 100}% guild · ${SEASON.weights.critic * 100}% critic`}
            note="Set by the commissioner."
          />
        </dl>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="bg-paper-raised px-6 py-7">
      <dt className="label-eyebrow">{label}</dt>
      <dd className="mt-2 text-xl tracking-tight">{value}</dd>
      {note && <p className="mt-2 text-xs text-ink-faint">{note}</p>}
    </div>
  );
}
