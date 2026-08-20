import { NextResponse } from "next/server";

import { getTopCast } from "@/lib/tmdb";

/**
 * Top-billed cast for a film, used by the acting categories on the ballot.
 * Proxied so the TMDB key stays server-side, and cached hard — billing order
 * for a finished film never changes.
 */
export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ cast: [], error: "A numeric film id is required." }, { status: 400 });
  }

  const cast = await getTopCast(id);
  return NextResponse.json(
    { cast },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
