import { NextResponse } from "next/server";

import {
  announceLineup,
  announceNominationsOpen,
  announceTest,
  announceWinners,
  webhookConfigured,
} from "@/lib/discord";
import { FIXTURE_FILMS } from "@/lib/mock/films";
import { FESTIVAL, GUILD, LINEUP_FILM_IDS } from "@/lib/mock/guild";
import { RESULTS } from "@/lib/mock/results";
import { hydrateCatalog } from "@/lib/tmdb";

type EventName = "test" | "nominations-open" | "lineup" | "winners";

/**
 * Fires a festival announcement into the guild's Discord channel. POST-only so a
 * stray link preview or prefetch can never post to someone's server.
 */
export async function POST(request: Request) {
  if (!webhookConfigured()) {
    return NextResponse.json(
      { error: "No webhook configured on the server." },
      { status: 400 },
    );
  }

  const { event } = (await request.json().catch(() => ({}))) as {
    event?: EventName;
  };

  const catalog = await hydrateCatalog(FIXTURE_FILMS);
  const byId = new Map(catalog.map((f) => [f.id, f]));
  const lineup = LINEUP_FILM_IDS.flatMap((id) => {
    const film = byId.get(id);
    return film ? [film] : [];
  });

  const result = await (async () => {
    switch (event) {
      case "nominations-open":
        return announceNominationsOpen(FESTIVAL, GUILD.name);
      case "lineup":
        return announceLineup(FESTIVAL, lineup, GUILD.name);
      case "winners":
        return announceWinners(
          FESTIVAL,
          RESULTS,
          Object.fromEntries(catalog.map((f) => [f.id, f])),
          GUILD.name,
        );
      case "test":
        return announceTest(GUILD.name);
      default:
        return { ok: false, error: "Unknown event." };
    }
  })();

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
