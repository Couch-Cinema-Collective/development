import "server-only";

import { BEST_OF_THE_FEST, type AwardResult, type Festival, type Film } from "./types";

/**
 * Outbound festival announcements (PLAN.md §3.5).
 *
 * The webhook URL is a bearer credential — anyone holding it can post to the
 * channel — so it stays server-side and is never returned to the browser.
 * Discord allows ~30 messages/min per webhook; we send single-digit numbers per
 * festival, so no queueing is warranted.
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

export function announceNominationsOpen(festival: Festival, guildName: string) {
  return post({
    title: `Festival ${festival.number} — ${festival.theme}`,
    description:
      "Nominations are open. Curators: one film each, and the lineup is whatever you put up.",
    color: BRAND_RED,
    fields: [
      { name: "Awards", value: String(festival.awards.length), inline: true },
      ...(festival.nominationDeadline
        ? [
            {
              name: "Closes",
              value: `<t:${Math.floor(new Date(festival.nominationDeadline).getTime() / 1000)}:R>`,
              inline: true,
            },
          ]
        : []),
    ],
    footer: { text: guildName },
  });
}

export function announceLineup(
  festival: Festival,
  lineup: Film[],
  guildName: string,
) {
  return post({
    title: `The lineup is set — ${festival.theme}`,
    description: lineup
      .map((film, i) => `**${i + 1}.** ${film.title} *(${film.year})*`)
      .join("\n"),
    color: BRAND_RED,
    footer: { text: `${guildName} · Festival ${festival.number}` },
  });
}

export function announceWinners(
  festival: Festival,
  results: AwardResult[],
  filmsById: Record<number, Film>,
  guildName: string,
) {
  // Best of the Fest is the headline; the honorary awards fill the fields.
  const best = results.find((r) => r.scoring);

  return post({
    title: `Festival ${festival.number} — the winners`,
    description: best
      ? `**${BEST_OF_THE_FEST}: ${filmsById[best.filmId]?.title ?? "—"}**`
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
      "Couch Cinema Collective will post festival announcements here — nominations opening, the lineup, each film's windows, and the winners.",
    color: BRAND_RED,
    footer: { text: guildName },
  });
}

export function webhookConfigured(): boolean {
  return Boolean(process.env.DISCORD_WEBHOOK_URL);
}
