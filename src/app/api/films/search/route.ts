import { NextResponse } from "next/server";
import { isLive, searchFilms } from "@/lib/tmdb";

/**
 * Nomination search. TMDB is proxied here so the API key never reaches the
 * browser (PLAN.md §3.1). Falls back to fixtures when no key is configured.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";

  try {
    const films = await searchFilms(query);
    return NextResponse.json({ films, live: isLive() });
  } catch (error) {
    console.error("Film search failed", error);
    return NextResponse.json(
      { films: [], live: isLive(), error: "Search is unavailable right now." },
      { status: 502 },
    );
  }
}
