"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Header navigation.
 *
 * Above `sm` the links sit inline as before. Below it they collapse behind a
 * menu button — at phone width the full row overflowed the viewport and pushed
 * the sign-in button off-screen, which is how it shipped until the iOS build
 * made it obvious.
 *
 * `authSlot` is rendered on the server (it reads the session) and passed in as
 * a node, so this stays a client component without dragging auth into the
 * browser bundle.
 */
export function SiteNav({
  items,
  authSlot,
  guildSlot = null,
}: {
  items: { href: string; label: string }[];
  authSlot: React.ReactNode;
  /** The guilds dropdown, rendered server-side and passed in like authSlot. */
  guildSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Navigating should always close the panel, including on back/forward.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Inline, tablet and up */}
      <nav className="hidden items-center gap-7 sm:flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="label-eyebrow transition-colors hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
        {guildSlot}
        {authSlot}
      </nav>

      {/* Phone */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="-mr-2 flex size-11 shrink-0 flex-col items-center justify-center gap-1.5 sm:hidden"
      >
        <span
          className={`block h-px w-6 bg-ink transition-transform ${
            open ? "translate-y-[3.5px] rotate-45" : ""
          }`}
        />
        <span
          className={`block h-px w-6 bg-ink transition-transform ${
            open ? "-translate-y-[3.5px] -rotate-45" : ""
          }`}
        />
      </button>

      {open && (
        <div
          id="site-menu"
          className="absolute inset-x-0 top-full z-40 border-b border-rule bg-paper-raised sm:hidden"
        >
          <nav className="flex flex-col px-6 py-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="label-eyebrow border-b border-rule py-4 transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            {guildSlot && (
              <div className="border-b border-rule py-4">{guildSlot}</div>
            )}
            <div className="py-4">{authSlot}</div>
          </nav>
        </div>
      )}
    </>
  );
}
