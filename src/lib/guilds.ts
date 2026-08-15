import "server-only";

import { createClient } from "@/lib/supabase/server";

export type GuildRole = "commissioner" | "member";

export interface Membership {
  guildId: string;
  guildName: string;
  role: GuildRole;
  memberCount: number;
}

export interface RosterEntry {
  userId: string;
  fullName: string;
  role: GuildRole;
  joinedAt: string;
}

export interface GuildHome {
  id: string;
  name: string;
  inviteCode: string;
  maxMembers: number;
  role: GuildRole;
  roster: RosterEntry[];
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
    .select("guild_id, role, guilds(name)")
    .eq("user_id", user.id);
  if (!rows?.length) return [];

  // Roster sizes in one query rather than one count per guild.
  const guildIds = rows.map((r) => r.guild_id);
  const { data: counts } = await supabase
    .from("guild_members")
    .select("guild_id")
    .in("guild_id", guildIds);
  const countByGuild = new Map<string, number>();
  for (const c of counts ?? []) {
    countByGuild.set(c.guild_id, (countByGuild.get(c.guild_id) ?? 0) + 1);
  }

  return rows.map((r) => ({
    guildId: r.guild_id,
    // PostgREST types to-one embeds loosely; at runtime this is one object.
    guildName: (r.guilds as unknown as { name: string })?.name ?? "Unnamed",
    role: r.role as GuildRole,
    memberCount: countByGuild.get(r.guild_id) ?? 1,
  }));
}

export interface SeasonSummary {
  id: string;
  number: number;
  category: string;
  state: string;
  filmCount: number;
  nominationDeadline: string | null;
}

/** Seasons for a guild, newest first. RLS scopes to members. */
export async function getGuildSeasons(guildId: string): Promise<SeasonSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("id, number, category, state, film_count, nomination_deadline")
    .eq("guild_id", guildId)
    .order("number", { ascending: false });

  return (data ?? []).map((s) => ({
    id: s.id,
    number: s.number,
    category: s.category,
    state: s.state,
    filmCount: s.film_count,
    nominationDeadline: s.nomination_deadline,
  }));
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
    .select("id, name, invite_code, max_members")
    .eq("id", guildId)
    .maybeSingle();
  if (!guild) return null;

  const { data: members } = await supabase
    .from("guild_members")
    .select("user_id, role, joined_at")
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
    joinedAt: m.joined_at,
  }));

  const me = roster.find((m) => m.userId === user.id);
  if (!me) return null;

  return {
    id: guild.id,
    name: guild.name,
    inviteCode: guild.invite_code,
    maxMembers: guild.max_members,
    role: me.role,
    roster,
  };
}
