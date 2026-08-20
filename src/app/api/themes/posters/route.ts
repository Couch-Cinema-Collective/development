import { NextResponse } from "next/server";

import { SEASON_CATEGORIES, type CategoryFamily } from "@/lib/mock/categories";
import { findFilmByTitle, isLive } from "@/lib/tmdb";

const FAMILIES: CategoryFamily[] = [
  "Genre",
  "Movement",
  "Auteur",
  "Era",
  "National",
  "Craft",
];

/**
 * Poster art for the theme picker, one family at a time.
 *
 * Each theme is represented by its first canonical exemplar, looked up by
 * title. Doing this on demand rather than at page load matters: there are 113
 * themes, and resolving every one of them up front would put a hundred TMDB
 * lookups in front of the wizard's first paint. A family is at most 37.
 *
 * Failures are answered with null rather than an error — the picker falls back
 * to a typographic tile, which is a fine outcome for a decorative image.
 */
export async function GET(request: Request) {
  const family = new URL(request.url).searchParams.get("family");

  if (!family || !FAMILIES.includes(family as CategoryFamily)) {
    return NextResponse.json({ error: "Unknown theme family." }, { status: 400 });
  }
  if (!isLive()) return NextResponse.json({ posters: {} });

  const themes = SEASON_CATEGORIES.filter((c) => c.family === family);

  const entries = await Promise.all(
    themes.map(async (theme) => {
      const title = theme.exemplars[0];
      if (!title) return [theme.id, null] as const;
      try {
        const film = await findFilmByTitle(title);
        return [theme.id, film?.posterPath ?? null] as const;
      } catch {
        return [theme.id, null] as const;
      }
    }),
  );

  return NextResponse.json(
    { posters: Object.fromEntries(entries) },
    // The mapping is static content; let it sit in the CDN for a day.
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
