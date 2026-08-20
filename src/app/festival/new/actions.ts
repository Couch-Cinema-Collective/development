"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AWARD_CATALOG,
  BEST_OF_THE_FEST_AWARD,
  CADENCE_PRESETS,
} from "@/lib/mock/awards";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_CUSTOM_AWARDS,
  type ThemeFamily,
  type Visibility,
} from "@/lib/types";

export interface CreateFestivalInput {
  guildId: string;
  /** The wizard lets the president rename the guild in passing. */
  guildName: string;
  theme: string;
  themeFamily: ThemeFamily;
  visibility: Visibility;
  /** A CADENCE_PRESETS id, or "custom" with the three windows below. */
  cadenceId: string;
  customViewingDays?: number;
  customReviewDays?: number;
  customVotingHours?: number;
  /** Honorary categories switched on from the catalog. */
  awardIds: string[];
  customAwardNames: string[];
}

const VALID_FAMILIES: ThemeFamily[] = [
  "nations",
  "filmmakers",
  "genres",
  "movements",
  "eras",
  "custom",
];

/**
 * Open a festival.
 *
 * It lands in DRAFT rather than NOMINATING: the president decides when the
 * window actually opens, from the one button on the guild page. Film count is
 * deliberately not set here — one film per curator means the lineup size is
 * the roster size, settled when the lineup is drawn.
 */
export async function createFestival(
  input: CreateFestivalInput,
): Promise<{ error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/festival/new");

  const { data: membership } = await supabase
    .from("guild_members")
    .select("role")
    .eq("guild_id", input.guildId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership?.role !== "president") {
    return { error: "Only the guild president can open a festival." };
  }

  const theme = input.theme.trim();
  if (!theme) return { error: "Give the festival a theme." };

  const themeFamily = VALID_FAMILIES.includes(input.themeFamily)
    ? input.themeFamily
    : "custom";
  const visibility: Visibility =
    input.visibility === "open" ? "open" : "closed";

  const preset = CADENCE_PRESETS.find((p) => p.id === input.cadenceId);
  if (!preset && input.cadenceId !== "custom") {
    return { error: "Pick a cadence." };
  }

  const viewingDays = clamp(
    preset?.viewingDays ?? input.customViewingDays ?? 14,
    1,
    60,
  );
  const reviewDays = clamp(
    preset?.reviewDays ?? input.customReviewDays ?? 2,
    1,
    14,
  );
  const votingHours = clamp(
    preset?.votingHours ?? input.customVotingHours ?? 24,
    1,
    168,
  );

  // Award names come from the server-side catalog — only custom names are
  // taken from the client, and only as display text.
  const catalogAwards = AWARD_CATALOG.filter((a) =>
    input.awardIds.includes(a.id),
  );
  const customAwards = input.customAwardNames
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, i) => ({
      id: `custom-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
      name,
      tier: "custom" as const,
    }));

  const honorary = [...catalogAwards, ...customAwards];
  if (honorary.length > MAX_CUSTOM_AWARDS) {
    return {
      error: `Honorary awards are capped at ${MAX_CUSTOM_AWARDS}. Best of the Fest is always on top of those.`,
    };
  }

  const guildName = input.guildName.trim();
  if (guildName) {
    await supabase
      .from("guilds")
      .update({ name: guildName })
      .eq("id", input.guildId);
  }

  const { data: latest } = await supabase
    .from("festivals")
    .select("number")
    .eq("guild_id", input.guildId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const number = (latest?.number ?? 0) + 1;

  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .insert({
      guild_id: input.guildId,
      number,
      title: theme,
      category: theme,
      theme,
      theme_family: themeFamily,
      visibility,
      state: "DRAFT",
      film_count: 0,
      viewing_days: viewingDays,
      review_days: reviewDays,
      voting_hours: votingHours,
    })
    .select("id")
    .single();
  if (festivalError) return { error: festivalError.message };

  // Best of the Fest is not optional and is the only award that scores.
  const { error: awardsError } = await supabase.from("festival_awards").insert(
    [
      {
        festival_id: festival.id,
        award_id: BEST_OF_THE_FEST_AWARD.id,
        name: BEST_OF_THE_FEST_AWARD.name,
        tier: BEST_OF_THE_FEST_AWARD.tier,
        scoring: true,
      },
      ...honorary.map((a) => ({
        festival_id: festival.id,
        award_id: a.id,
        name: a.name,
        tier: a.tier,
        scoring: false,
      })),
    ],
  );
  if (awardsError) {
    // Best-effort rollback so a half-created festival doesn't linger.
    await supabase.from("festivals").delete().eq("id", festival.id);
    return { error: awardsError.message };
  }

  revalidatePath(`/guild/${input.guildId}`);
  redirect(`/guild/${input.guildId}`);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}
