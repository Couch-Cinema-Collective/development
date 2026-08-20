"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export interface SwitcherGuild {
  guildId: string;
  guildName: string;
  /** What that guild's festival is doing, for the secondary line. */
  note?: string;
}

/**
 * Switch between guilds without leaving the screen you are on.
 *
 * Every festival surface picks a guild with `?guild=`, and until now a member
 * of two guilds could only ever see whichever one sorted first — there was no
 * way to reach the other. This keeps the current path and swaps the query, so
 * switching on the dashboard lands you on the other guild's dashboard.
 */
export function GuildSwitcher({
  guilds,
  activeGuildId,
}: {
  guilds: SwitcherGuild[];
  activeGuildId: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  // One guild is not a choice worth rendering.
  if (guilds.length < 2) return null;

  function hrefFor(guildId: string) {
    const next = new URLSearchParams(params.toString());
    next.set("guild", guildId);
    return `${pathname}?${next.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label-eyebrow mr-1">Guild</span>
      {guilds.map((g) => {
        const active = g.guildId === activeGuildId;
        return (
          <Link
            key={g.guildId}
            href={hrefFor(g.guildId)}
            aria-current={active ? "true" : undefined}
            className={`border px-3.5 py-2 text-xs font-medium uppercase tracking-[0.1em] transition-colors ${
              active
                ? "border-ink bg-ink text-paper"
                : "border-rule hover:border-ink"
            }`}
          >
            {g.guildName}
          </Link>
        );
      })}
    </div>
  );
}
