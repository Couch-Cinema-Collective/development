import type { Metadata } from "next";
import { Jost } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { AuthStatus } from "@/components/AuthStatus";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Geometric grotesque, the closest free match to the wordmark in the logo lockup.
const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Couch Cinema Collective",
  description:
    "Guilds of film watchers nominate, watch, and award a season of cinema together.",
};

/**
 * Deliberately spare (per design review): the season surfaces — draft,
 * season room, ballot, ceremony — are navigated from the guild page, not
 * from here.
 */
const PUBLIC_NAV = [
  { href: "/", label: "Home" },
  { href: "/wiki", label: "Film Collection" },
];

// "My Guilds" lives as the boxed button in AuthStatus, not here — having it
// in both places read as a duplicate.
const MEMBER_NAV = [{ href: "/profile", label: "Profile" }];

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let signedIn = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }
  const nav = signedIn ? [...PUBLIC_NAV, ...MEMBER_NAV] : PUBLIC_NAV;

  return (
    <html lang="en" className={jost.variable}>
      <body className="min-h-screen antialiased">
        <header className="border-b border-rule bg-paper-raised">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
            <Link href="/" className="shrink-0">
              <Image
                src="/brand/Cinema_logo_black_hor.png"
                alt="Couch Cinema Collective"
                width={980}
                height={300}
                priority
                className="h-9 w-auto"
              />
            </Link>

            <nav className="flex items-center gap-7">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="label-eyebrow transition-colors hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
              <AuthStatus />
            </nav>
          </div>
        </header>

        {children}

        <footer className="mt-24 border-t border-rule">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <p className="max-w-xl text-xs leading-relaxed text-ink-faint">
              This product uses the TMDB API but is not endorsed or certified by
              TMDB.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
