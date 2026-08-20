import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isCurator, type GuildRole, type MembershipStatus } from "@/lib/types";

export type { GuildRole } from "@/lib/types";

export interface Membership {
  guildId: string;
  guildName: string;
  role: GuildRole;
  status: MembershipStatus;
  curatorCount: number;
  criticCount: number;
}

export interface RosterEntry {
  userId: string;
  fullName: string;
  role: GuildRole;
  status: MembershipStatus;
  joinedAt: string;
}

export interface GuildHome {
  id: string;
  name: string;
  inviteCode: string;
  maxCurators: number;
  maxCritics: number;
  role: GuildRole;
  /** Curators and the president — the people who nominate. */
  curators: RosterEntry[];
  /** The rest of the voting body. */
  critics: RosterEntry[];
  /** Curator applications the president has yet to rule on. */
  pending: RosterEntry[];
}

/** Every guild the signed-in user belongs to (RLS scopes the rows). */
export async function getUserMemberships(): Promise<Membership[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("guild_members")
    .select("guild_id, role, status, guilds(name)")
    .eq("user_id", user.id);
  if (!rows?.length) return [];

  // Roster sizes in one query rather than one count per guild.
  const guildIds = rows.map((r) => r.guild_id);
  const { data: everyone } = await supabase
    .from("guild_members")
    .select("guild_id, role, status")
    .in("guild_id", guildIds)
    .eq("status", "active");

  const curators = new Map<string, number>();
  const critics = new Map<string, number>();
  for (const m of everyone ?? []) {
    const bucket = isCurator(m.role as GuildRole) ? curators : critics;
    bucket.set(m.guild_id, (bucket.get(m.guild_id) ?? 0) + 1);
  }

  return rows.map((r) => ({
    guildId: r.guild_id,
    // PostgREST types to-one embeds loosely; at runtime this is one object.
    guildName: (r.guilds as unknown as { name: string })?.name ?? "Unnamed",
    role: r.role as GuildRole,
    status: r.status as MembershipStatus,
    curatorCount: curators.get(r.guild_id) ?? 0,
    criticCount: critics.get(r.guild_id) ?? 0,
  }));
}

/** Guilds this user actually participates in — pending applications excluded. */
export async function getActiveMemberships(): Promise<Membership[]> {
  return (await getUserMemberships()).filter((m) => m.status === "active");
}

export interface FestivalSummary {
  id: string;
  number: number;
  theme: string;
  themeFamily: string;
  state: string;
  visibility: string;
  filmCount: number;
  nominationDeadline: string | null;
  screeningStartsAt: string | null;
}

const FESTIVAL_COLUMNS =
  "id, number, theme, theme_family, state, visibility, film_count, nomination_deadline, screening_starts_at";

/** Shared shape mapper so every festival query returns the same object. */
export function toFestivalSummary(row: {
  id: string;
  number: number;
  theme: string;
  theme_family: string;
  state: string;
  visibility: string;
  film_count: number;
  nomination_deadline: string | null;
  screening_starts_at: string | null;
}): FestivalSummary {
  return {
    id: row.id,
    number: row.number,
    theme: row.theme,
    themeFamily: row.theme_family,
    state: row.state,
    visibility: row.visibility,
    filmCount: row.film_count,
    nominationDeadline: row.nomination_deadline,
    screeningStartsAt: row.screening_starts_at,
  };
}

/** Festivals for a guild, newest first. RLS scopes to members. */
export async function getGuildFestivals(
  guildId: string,
): Promise<FestivalSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("festivals")
    .select(FESTIVAL_COLUMNS)
    .eq("guild_id", guildId)
    .order("number", { ascending: false });

  return (data ?? []).map(toFestivalSummary);
}

/**
 * The festival a member should be looking at right now, across all their
 * guilds. `states` narrows it to the ones a given screen can actually render.
 */
export async function getCurrentFestival(
  states: string[],
  preferGuildId?: string,
): Promise<(FestivalSummary & { guildId: string; guildName: string }) | null> {
  const supabase = await createClient();
  const memberships = await getActiveMemberships();
  if (!memberships.length) return null;

  const { data } = await supabase
    .from("festivals")
    .select(`${FESTIVAL_COLUMNS}, guild_id`)
    .in(
      "guild_id",
      memberships.map((m) => m.guildId),
    )
    .in("state", states)
    .order("number", { ascending: false });

  const rows = data ?? [];
  const row = rows.find((r) => r.guild_id === preferGuildId) ?? rows[0];
  if (!row) return null;

  return {
    ...toFestivalSummary(row),
    guildId: row.guild_id,
    guildName:
      memberships.find((m) => m.guildId === row.guild_id)?.guildName ?? "",
  };
}

/** Guild + roster for the guild home page. Null if not a member (RLS). */
export async function getGuildHome(guildId: string): Promise<GuildHome | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: guild } = await supabase
    .from("guilds")
    .select("id, name, invite_code, max_curators, max_critics")
    .eq("id", guildId)
    .maybeSingle();
  if (!guild) return null;

  const { data: members } = await supabase
    .from("guild_members")
    .select("user_id, role, status, joined_at")
    .eq("guild_id", guildId)
    .order("joined_at");

  // guild_members FKs auth.users (not profiles), so PostgREST can't embed the
  // names — fetch them in a second query.
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name || "Member"]),
  );

  const roster: RosterEntry[] = (members ?? []).map((m) => ({
    userId: m.user_id,
    fullName: nameById.get(m.user_id) ?? "Member",
    role: m.role as GuildRole,
    status: m.status as MembershipStatus,
    joinedAt: m.joined_at,
  }));

  const me = roster.find((m) => m.userId === user.id);
  if (!me || me.status !== "active") return null;

  const active = roster.filter((m) => m.status === "active");

  return {
    id: guild.id,
    name: guild.name,
    inviteCode: guild.invite_code,
    maxCurators: guild.max_curators,
    maxCritics: guild.max_critics,
    role: me.role,
    // President first, then curators in joining order.
    curators: active
      .filter((m) => isCurator(m.role))
      .sort((a, b) =>
        a.role === b.role ? 0 : a.role === "president" ? -1 : 1,
      ),
    critics: active.filter((m) => m.role === "critic"),
    pending: roster.filter((m) => m.status === "pending"),
  };
}
