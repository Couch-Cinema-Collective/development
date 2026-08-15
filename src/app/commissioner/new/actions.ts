"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AWARD_CATALOG, SEASON_PRESETS } from "@/lib/mock/awards";
import { MAX_AWARD_CATEGORIES } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export interface CreateSeasonInput {
  guildId: string;
  /** The wizard lets the commissioner rename the guild in passing. */
  guildName: string;
  categoryName: string;
  presetId: string;
  awardIds: string[];
  customAwardNames: string[];
  /** 0–100, the guild-conviction slider. */
  guildWeight: number;
}

/** Days members get to nominate, scaled to the season's tempo. */
const NOMINATION_WINDOW_DAYS: Record<string, number> = {
  standard: 7,
  year: 14,
  sprint: 3,
};

export async function createSeason(
  input: CreateSeasonInput,
): Promise<{ error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/commissioner/new");

  const { data: membership } = await supabase
    .from("guild_members")
    .select("role")
    .eq("guild_id", input.guildId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership?.role !== "commissioner") {
    return { error: "Only the guild president can open a season." };
  }

  const preset = SEASON_PRESETS.find((p) => p.id === input.presetId);
  if (!preset) return { error: "Pick a season format." };

  const categoryName = input.categoryName.trim();
  if (!categoryName) return { error: "Pick a season category." };

  // Award names come from the server-side catalog — only custom names are
  // taken from the client, and only as display text.
  const catalogAwards = AWARD_CATALOG.filter(
    (a) => a.locked || input.awardIds.includes(a.id),
  );
  const customAwards = input.customAwardNames
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, i) => ({
      id: `custom-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
      name,
      tier: "custom" as const,
    }));
  const awards = [...catalogAwards, ...customAwards];
  if (awards.length > MAX_AWARD_CATEGORIES) {
    return { error: `Awards are capped at ${MAX_AWARD_CATEGORIES}.` };
  }

  const guildWeight = Math.min(100, Math.max(0, Math.round(input.guildWeight)));

  const guildName = input.guildName.trim();
  if (guildName) {
    await supabase
      .from("guilds")
      .update({ name: guildName })
      .eq("id", input.guildId);
  }

  const { data: latest } = await supabase
    .from("seasons")
    .select("number")
    .eq("guild_id", input.guildId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const number = (latest?.number ?? 0) + 1;

  const windowDays = NOMINATION_WINDOW_DAYS[preset.id] ?? 7;
  const deadline = new Date(
    Date.now() + windowDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .insert({
      guild_id: input.guildId,
      number,
      title: categoryName,
      category: categoryName,
      state: "NOMINATING",
      film_count: preset.filmCount,
      nomination_deadline: deadline,
      w_guild: guildWeight / 100,
      w_critic: (100 - guildWeight) / 100,
    })
    .select("id")
    .single();
  if (seasonError) return { error: seasonError.message };

  const { error: awardsError } = await supabase.from("season_awards").insert(
    awards.map((a) => ({
      season_id: season.id,
      award_id: a.id,
      name: a.name,
      tier: a.tier,
    })),
  );
  if (awardsError) {
    // Best-effort rollback so a half-created season doesn't linger.
    await supabase.from("seasons").delete().eq("id", season.id);
    return { error: awardsError.message };
  }

  revalidatePath(`/guild/${input.guildId}`);
  redirect(`/guild/${input.guildId}`);
}
