import Link from "next/link";
import { redirect } from "next/navigation";

import { CopyButton } from "@/components/CopyButton";
import { Countdown } from "@/components/Countdown";
import { CuratorSeats } from "@/components/CuratorSeats";
import { LockedSubmission } from "@/components/LockedSubmission";
import { PresidentPanel } from "@/components/PresidentPanel";
import { getGuildFestivals, getGuildHome } from "@/lib/guilds";
import { createClient } from "@/lib/supabase/server";
import { isCurator, MAX_CRITICS, type Film } from "@/lib/types";

/** Member-facing label per festival state. */
const STATE_LABELS: Record<string, string> = {
  DRAFT: "Setting up",
  RECRUITING: "Recruiting",
  NOMINATING: "Nominations open",
  LINEUP_SET: "Lineup set",
  SCREENING: "Screening",
  AWARDS_VOTING: "Awards voting",
  CEREMONY: "Ceremony published",
  ARCHIVED: "Archived",
};

/**
 * Where a member goes from here, given what the festival is doing. One
 * destination, not a menu — the rail of four half-lit links it replaces made
 * every member work out which surface was live.
 */
function memberAction(
  state: string | undefined,
  guildId: string,
  curator: boolean,
  awaitingOpen = false,
): { href: string; label: string; note: string } | null {
  switch (state) {
    case "NOMINATING":
      return curator
        ? {
            href: `/nominate?guild=${guildId}`,
            label: "Pick your film",
            note: "Nominations are open — one film, your pick.",
          }
        : {
            href: `/guild/${guildId}`,
            label: "",
            note: "Curators are choosing. Your part starts when the first film opens.",
          };
    case "LINEUP_SET":
    case "SCREENING":
      return {
        href: `/dashboard?guild=${guildId}`,
        label: "Go to your dashboard",
        note: awaitingOpen
          ? "The lineup is drawn. Nothing is screening until your president opens the festival."
          : "Watch, review, and vote — the clock is running.",
      };
    case "AWARDS_VOTING":
      return {
        href: `/vote?guild=${guildId}`,
        label: "Cast your ballot",
        note: "One pick per award. Best of the Fest decides it.",
      };
    case "CEREMONY":
    case "ARCHIVED":
      return {
        href: `/ceremony?guild=${guildId}`,
        label: "See the results",
        note: "The envelopes are open.",
      };
    default:
      return null;
  }
}

export default async function GuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/guild/${id}`)}`);

  const guild = await getGuildHome(id);
  // Not a member (or no such guild) — RLS returns nothing either way.
  if (!guild) redirect("/welcome");

  const festivals = await getGuildFestivals(id);
  const current = festivals.find(
    (f) => f.state !== "ARCHIVED" && f.state !== "CEREMONY",
  );
  const finished = festivals.filter(
    (f) => f.state === "CEREMONY" || f.state === "ARCHIVED",
  );

  const president = guild.role === "president";
  const curator = isCurator(guild.role);

  // A curator who has already locked in gets their submission back rather than
  // a call to action they have no way to act on.
  const nominating = current?.state === "NOMINATING";
  const [{ data: myNomination }, { data: countRow }] =
    nominating && curator
      ? await Promise.all([
          supabase
            .from("nominations")
            .select("film, locked")
            .eq("festival_id", current.id)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .rpc("nomination_count", { fid: current.id })
            .maybeSingle(),
        ])
      : [{ data: null }, { data: null }];

  // Has any film actually started? A festival can sit in SCREENING with its
  // whole schedule still in the future, in which case it is not open at all.
  const { data: startedRows } =
    current && ["LINEUP_SET", "SCREENING"].includes(current.state)
      ? await supabase
          .from("lineup_films")
          .select("tmdb_id, viewing_starts_at")
          .eq("festival_id", current.id)
      : { data: null };
  const drawn = (startedRows ?? []).length;
  const started = (startedRows ?? []).filter(
    (f) => f.viewing_starts_at && new Date(f.viewing_starts_at) <= new Date(),
  ).length;
  const awaitingOpen = drawn > 0 && started === 0;

  const lockedIn = Boolean(myNomination?.locked);
  const counts = countRow as
    | { submitted: number; picked: number; expected: number }
    | null;

  const action = lockedIn
    ? null
    : memberAction(current?.state, guild.id, curator, awaitingOpen);
  const seatsLeft = guild.maxCurators - guild.curators.length;

  // Invite links always carry the canonical domain (design decision) — a
  // link copied during local dev must still work for the person receiving it.
  const inviteUrl = `https://www.couchcinemacollective.com/join/${guild.inviteCode}`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">
          {president ? "Your guild · President" : `Your guild · ${curator ? "Curator" : "Critic"}`}
        </p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          {guild.name}
        </h1>
        {current && (
          <p className="mt-4 text-sm text-ink-soft">
            Festival {current.number} · {current.theme} ·{" "}
            {STATE_LABELS[current.state] ?? current.state}
          </p>
        )}
      </header>

      <div className="mt-10 space-y-10">
        {/* ── The president's single next move ───────────────────────────── */}
        {president && current && (
          <PresidentPanel
            festivalId={current.id}
            state={current.state}
            deadline={current.nominationDeadline}
            awaitingOpen={awaitingOpen}
          />
        )}

        {president && !current && (
          <section className="border border-ink bg-paper-raised p-6">
            <p className="label-eyebrow text-signal">Your move</p>
            <p className="mt-2 text-2xl font-medium uppercase leading-tight tracking-tight">
              {festivals.length === 0
                ? "Programme your first festival"
                : "No festival running"}
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
              Pick a theme, set the pace, name the awards. Your curators put one
              film up each, and the lineup follows from that.
            </p>
            <Link
              href={`/festival/new?guild=${guild.id}`}
              className="mt-6 inline-block bg-signal px-7 py-3.5 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink"
            >
              {festivals.length === 0 ? "Programme it" : "Open the next one"}
            </Link>
          </section>
        )}

        {president && (
          <CuratorSeats
            guildId={guild.id}
            seats={guild.maxCurators}
            filled={guild.curators.length}
          />
        )}

        {/* ── A submitted film, or what to do next ───────────────────────── */}
        {lockedIn && myNomination?.film && (
          <LockedSubmission
            film={myNomination.film as Film}
            deadline={current?.nominationDeadline ?? null}
            submitted={Number(counts?.submitted ?? 0)}
            expected={Number(counts?.expected ?? guild.curators.length)}
          />
        )}

        {action && (
          <section className="border border-rule bg-paper-raised p-6">
            <p className="label-eyebrow">
              {president ? "As a member" : "What's next"}
            </p>
            {action.label ? (
              <>
                <p className="mt-2 text-sm text-ink-soft">{action.note}</p>
                <Link
                  href={action.href}
                  className="mt-5 inline-block bg-signal px-7 py-3.5 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink"
                >
                  {action.label}
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">{action.note}</p>
            )}

            {current?.state === "NOMINATING" && current.nominationDeadline && (
              <div className="mt-6 border-t border-rule pt-5">
                <p className="label-eyebrow">Nominations close in</p>
                <div className="mt-2">
                  <Countdown
                    deadline={current.nominationDeadline}
                    expiredLabel="Nominations closed"
                    size="small"
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Invites ────────────────────────────────────────────────────── */}
        {president && (
          <section className="border border-rule bg-paper-raised p-6">
            <h2 className="label-eyebrow">Invite</h2>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <code className="min-w-0 flex-1 break-all text-sm">
                {inviteUrl}
              </code>
              <CopyButton text={inviteUrl} />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
              Anyone with this link picks their own chair on the way in.
              Critic seats are effectively unlimited; curator seats are{" "}
              {seatsLeft > 0
                ? `first come first served — ${seatsLeft} of ${guild.maxCurators} still free.`
                : `all taken (${guild.maxCurators} of ${guild.maxCurators}).`}
            </p>
          </section>
        )}

        {/* ── The roster, split by what people actually do ───────────────── */}
        <section>
          <h2 className="label-eyebrow border-b border-rule pb-2">
            Curators · {guild.curators.length} of {guild.maxCurators}
          </h2>
          <ul className="mt-4 grid gap-px border border-rule bg-rule">
            {guild.curators.map((m) => (
              <li
                key={m.userId}
                className="flex items-baseline justify-between gap-6 bg-paper-raised px-6 py-4"
              >
                <span className="font-medium">
                  {m.fullName}
                  {m.userId === user.id && (
                    <span className="ml-2 text-xs text-ink-faint">(you)</span>
                  )}
                </span>
                <span className="label-eyebrow">
                  {m.role === "president" ? "President" : "Curator"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-faint">
            One film each, so the lineup runs to {guild.curators.length} film
            {guild.curators.length === 1 ? "" : "s"}.
          </p>
        </section>

        <section>
          <h2 className="label-eyebrow border-b border-rule pb-2">
            Critics · {guild.critics.length} of {guild.maxCritics || MAX_CRITICS}
          </h2>
          {guild.critics.length > 0 ? (
            <ul className="mt-4 grid gap-px border border-rule bg-rule">
              {guild.critics.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-baseline justify-between gap-6 bg-paper-raised px-6 py-4"
                >
                  <span className="font-medium">
                    {m.fullName}
                    {m.userId === user.id && (
                      <span className="ml-2 text-xs text-ink-faint">(you)</span>
                    )}
                  </span>
                  <span className="label-eyebrow">Critic</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
              No critics beyond the curators yet. The voting body can run to{" "}
              {guild.maxCritics || MAX_CRITICS} — share the invite link.
            </p>
          )}
        </section>

        {finished.length > 0 && (
          <section>
            <h2 className="label-eyebrow border-b border-rule pb-2">
              Past festivals
            </h2>
            <ul className="mt-4 grid gap-px border border-rule bg-rule">
              {finished.map((f) => (
                <li key={f.id} className="bg-paper-raised">
                  <Link
                    href={`/ceremony?guild=${guild.id}`}
                    className="flex items-baseline justify-between gap-6 px-6 py-4 transition-colors hover:bg-paper"
                  >
                    <span className="font-medium uppercase tracking-tight">
                      Festival {f.number} · {f.theme}
                    </span>
                    <span className="label-eyebrow">
                      {STATE_LABELS[f.state]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
