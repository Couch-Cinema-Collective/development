import "server-only";

import type { AwardResult, Film, Season } from "./types";

/**
 * Outbound season announcements (PLAN.md §3.5).
 *
 * The webhook URL is a bearer credential — anyone holding it can post to the
 * channel — so it stays server-side and is never returned to the browser.
 * Discord allows ~30 messages/min per webhook; we send single-digit numbers per
 * season, so no queueing is warranted.
 */

const BRAND_RED = 0xe62b24;

interface Embed {
  title: string;
  description?: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

async function post(embed: Embed): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return { ok: false, error: "No webhook configured." };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Couch Cinema Collective",
        embeds: [{ ...embed, timestamp: new Date().toISOString() }],
      }),
    });

    // Discord returns 204 with an empty body on success.
    if (!res.ok) return { ok: false, error: `Discord returned ${res.status}.` };
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach Discord." };
  }
}

export function announceDraftOpen(season: Season, guildName: string) {
  return post({
    title: `Season ${season.number} — ${season.category}`,
    description:
      "Nominations are open. You have five points to spend. Stack them on one film or spread them across five.",
    color: BRAND_RED,
    fields: [
      { name: "Films", value: String(season.filmCount), inline: true },
      { name: "Awards", value: String(season.awards.length), inline: true },
      {
        name: "Locks",
        value: `<t:${Math.floor(new Date(season.nominationDeadline).getTime() / 1000)}:R>`,
        inline: true,
      },
    ],
    footer: { text: guildName },
  });
}

export function announceSlate(season: Season, slate: Film[], guildName: string) {
  return post({
    title: `The slate is set — ${season.category}`,
    description: slate
      .map((film, i) => `**${i + 1}.** ${film.title} *(${film.year})*`)
      .join("\n"),
    color: BRAND_RED,
    footer: { text: `${guildName} · Season ${season.number}` },
  });
}

export function announceWinners(
  season: Season,
  results: AwardResult[],
  filmsById: Record<number, Film>,
  guildName: string,
) {
  const picture = results.find((r) => r.awardId === "picture");

  return post({
    title: `Season ${season.number} — the winners`,
    description: picture
      ? `**Best Picture: ${filmsById[picture.filmId]?.title ?? "—"}**`
      : undefined,
    color: BRAND_RED,
    fields: results.slice(0, 25).map((result) => ({
      name: result.awardName,
      value: filmsById[result.filmId]?.title ?? "—",
      inline: true,
    })),
    footer: { text: guildName },
  });
}

export function announceTest(guildName: string) {
  return post({
    title: "Connected",
    description:
      "Couch Cinema Collective will post season announcements here — draft opening, nominations locking, the slate, voting, and the winners.",
    color: BRAND_RED,
    footer: { text: guildName },
  });
}

export function webhookConfigured(): boolean {
  return Boolean(process.env.DISCORD_WEBHOOK_URL);
}
