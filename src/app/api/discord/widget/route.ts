import { NextResponse } from "next/server";

/**
 * Proxy for a server's public widget.json.
 *
 * Discord serves this to anyone once the server owner enables the widget, so
 * there is no secret involved. Proxying it avoids a cross-origin fetch from the
 * browser and lets us cache — presence changes constantly, so 60s is plenty.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "A numeric server ID is required." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://discord.com/api/guilds/${id}/widget.json`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      // 403 is the common one: the server exists but the widget is switched off.
      return NextResponse.json(
        {
          error:
            res.status === 403
              ? "That server's widget is disabled. Enable it in Server Settings → Engagement → Widget."
              : `Discord returned ${res.status}.`,
        },
        { status: res.status === 403 ? 403 : 502 },
      );
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Could not reach Discord." }, { status: 502 });
  }
}
