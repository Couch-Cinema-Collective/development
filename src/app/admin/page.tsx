import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin — Couch Cinema Collective",
  robots: { index: false, follow: false },
};

/** Member-facing labels, borrowed from the guild page. */
const STATE_LABELS: Record<string, string> = {
  DRAFT: "Setting up",
  RECRUITING: "Recruiting",
  NOMINATING: "Nominating",
  LINEUP_SET: "Lineup set",
  SCREENING: "Screening",
  AWARDS_VOTING: "Awards voting",
  CEREMONY: "Ceremony",
  ARCHIVED: "Archived",
};

/**
 * Operator dashboard: accounts, guilds, and a 7-day activity pulse.
 *
 * Gated by ADMIN_EMAILS (comma-separated) — anyone else gets a 404, so the
 * page doesn't advertise its own existence. Reads go through the
 * service-role client because RLS would otherwise scope them to the
 * operator's own guilds.
 */
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (
    !user?.email ||
    !allowed.includes(user.email.toLowerCase()) ||
    !adminConfigured()
  ) {
    notFound();
  }

  const admin = createAdminClient();
  const { weekAgo, twoWeeksAgo } = activityWindow();

  const [
    { count: totalUsers },
    { count: newThisWeek },
    { count: newLastWeek },
    { data: guilds },
    { data: members },
    { data: festivals },
    { data: nominations },
    { data: watches },
    { data: reviews },
    { data: votes },
    { count: upvotes7d },
    { count: deviceTokens },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", twoWeeksAgo)
      .lt("created_at", weekAgo),
    admin.from("guilds").select("id, name, max_curators, max_critics"),
    admin.from("guild_members").select("guild_id, user_id, role, status"),
    admin.from("festivals").select("id, guild_id, number, theme, state"),
    admin
      .from("nominations")
      .select("festival_id, user_id")
      .gte("created_at", weekAgo),
    admin
      .from("watch_records")
      .select("festival_id, user_id")
      .gte("watched_at", weekAgo),
    admin
      .from("reviews")
      .select("festival_id, user_id")
      .gte("created_at", weekAgo),
    admin.from("votes").select("festival_id, user_id").gte("created_at", weekAgo),
    admin
      .from("review_votes")
      .select("review_id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    admin.from("device_tokens").select("token", { count: "exact", head: true }),
  ]);

  // Roster sizes and the running (or latest) festival per guild.
  const curatorCount = new Map<string, number>();
  const criticCount = new Map<string, number>();
  for (const m of members ?? []) {
    if (m.status && m.status !== "active") continue;
    const bucket =
      m.role === "president" || m.role === "curator" ? curatorCount : criticCount;
    bucket.set(m.guild_id, (bucket.get(m.guild_id) ?? 0) + 1);
  }
  const currentFestival = new Map<
    string,
    { number: number; theme: string; state: string }
  >();
  for (const f of festivals ?? []) {
    const held = currentFestival.get(f.guild_id);
    if (!held || f.number > held.number) currentFestival.set(f.guild_id, f);
  }

  // Activity joins to guilds through festivals; a member is "active" if they
  // contributed anything — a nomination, a watch mark, a review, a ballot.
  const guildByFestival = new Map(
    (festivals ?? []).map((f) => [f.id, f.guild_id]),
  );
  const activity = [
    ...(nominations ?? []),
    ...(watches ?? []),
    ...(reviews ?? []),
    ...(votes ?? []),
  ];
  const activeByGuild = new Map<string, Set<string>>();
  const activeGlobal = new Set<string>();
  for (const row of activity) {
    activeGlobal.add(row.user_id);
    const guildId = guildByFestival.get(row.festival_id);
    if (!guildId) continue;
    const set = activeByGuild.get(guildId) ?? new Set<string>();
    set.add(row.user_id);
    activeByGuild.set(guildId, set);
  }

  const weekly = [
    { label: "Nominations", value: (nominations ?? []).length },
    { label: "Films marked watched", value: (watches ?? []).length },
    { label: "Reviews", value: (reviews ?? []).length },
    { label: "Review upvotes", value: upvotes7d ?? 0 },
    { label: "Ballot votes", value: (votes ?? []).length },
  ];

  const rows = (guilds ?? [])
    .map((g) => ({
      ...g,
      curators: curatorCount.get(g.id) ?? 0,
      critics: criticCount.get(g.id) ?? 0,
      festival: currentFestival.get(g.id),
      active: activeByGuild.get(g.id)?.size ?? 0,
    }))
    .sort(
      (a, b) =>
        b.active - a.active ||
        b.curators + b.critics - (a.curators + a.critics),
    );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">Operator&apos;s box</p>
        <h1 className="mt-3 text-4xl font-medium uppercase leading-none tracking-tight sm:text-5xl">
          Admin
        </h1>
      </header>

      <section className="mt-10">
        <h2 className="label-eyebrow border-b border-rule pb-2">Accounts</h2>
        <dl className="mt-4 grid gap-px border border-rule bg-rule sm:grid-cols-3">
          <Stat label="Total accounts" value={totalUsers ?? 0} />
          <Stat
            label="New this week"
            value={newThisWeek ?? 0}
            note={`${newLastWeek ?? 0} the week before`}
          />
          <Stat label="Devices with push" value={deviceTokens ?? 0} />
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="label-eyebrow border-b border-rule pb-2">
          Guilds · {rows.length}
        </h2>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-ink-faint">No guilds yet.</p>
        ) : (
          <ul className="mt-4 grid gap-px border border-rule bg-rule">
            {rows.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-baseline gap-x-6 gap-y-1 bg-paper-raised px-6 py-4"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {g.name}
                </span>
                <span className="label-eyebrow">
                  {g.curators} curator{g.curators === 1 ? "" : "s"} · {g.critics}{" "}
                  critic{g.critics === 1 ? "" : "s"}
                </span>
                <span className="label-eyebrow">
                  {g.festival
                    ? `F${g.festival.number} · ${
                        STATE_LABELS[g.festival.state] ?? g.festival.state
                      }`
                    : "No festival"}
                </span>
                <span
                  className={`label-eyebrow ${g.active > 0 ? "text-signal" : ""}`}
                >
                  {g.active} active this week
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="label-eyebrow border-b border-rule pb-2">Last 7 days</h2>
        <dl className="mt-4 grid gap-px border border-rule bg-rule sm:grid-cols-3">
          <Stat label="Members active anywhere" value={activeGlobal.size} />
          {weekly.map((w) => (
            <Stat key={w.label} label={w.label} value={w.value} />
          ))}
        </dl>
      </section>
    </main>
  );
}

/** The 7- and 14-day cutoffs, computed per request (the page is dynamic). */
function activityWindow() {
  const now = Date.now();
  return {
    weekAgo: new Date(now - 7 * 86400_000).toISOString(),
    twoWeeksAgo: new Date(now - 14 * 86400_000).toISOString(),
  };
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="bg-paper-raised px-6 py-5">
      <dt className="label-eyebrow">{label}</dt>
      <dd className="mt-2 text-4xl font-medium leading-none tabular-nums">
        {value}
      </dd>
      {note && <dd className="mt-2 text-xs text-ink-faint">{note}</dd>}
    </div>
  );
}
