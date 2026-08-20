"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface MenuGuild {
  guildId: string;
  guildName: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  president: "President",
  curator: "Curator",
  critic: "Critic",
};

/**
 * The guilds dropdown in the header.
 *
 * Members of more than one guild had no way to move between them from the
 * nav — every route defaulted to whichever guild sorted first. This lists them
 * all with the chair you hold in each, plus a direct line to that guild's
 * dashboard.
 */
export function GuildMenu({ guilds }: { guilds: MenuGuild[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Which route the menu was opened on. Deriving `open` from this rather than
  // closing it in an effect means navigation — including back/forward — closes
  // it during the same render, with no cascading update.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  // So does clicking anywhere else, or pressing escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenedOn(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenedOn(null);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (guilds.length === 0) return null;

  // A single guild needs no menu — link straight to it.
  if (guilds.length === 1) {
    return (
      <Link
        href={`/guild/${guilds[0].guildId}`}
        className="label-eyebrow transition-colors hover:text-ink"
      >
        My Guild
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpenedOn(open ? null : pathname)}
        aria-expanded={open}
        aria-haspopup="true"
        className="label-eyebrow flex items-center gap-1.5 transition-colors hover:text-ink"
      >
        My Guilds
        <span aria-hidden className={open ? "rotate-180" : ""}>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 min-w-56 border border-rule bg-paper-raised shadow-lg">
          <ul className="grid gap-px bg-rule">
            {guilds.map((g) => (
              <li key={g.guildId} className="bg-paper-raised">
                <Link
                  href={`/guild/${g.guildId}`}
                  className="block px-4 py-3 transition-colors hover:bg-paper"
                >
                  <span className="block truncate text-sm font-medium uppercase tracking-tight">
                    {g.guildName}
                  </span>
                  <span className="label-eyebrow">
                    {ROLE_LABEL[g.role] ?? g.role}
                  </span>
                </Link>
              </li>
            ))}
            <li className="bg-paper-raised">
              <Link
                href="/dashboard"
                className="block px-4 py-3 text-xs uppercase tracking-[0.12em] text-ink-soft transition-colors hover:bg-paper hover:text-signal"
              >
                Go to dashboard →
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
