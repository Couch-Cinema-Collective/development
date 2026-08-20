import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { AuthStatus } from "@/components/AuthStatus";
import { PushRegistrar } from "@/components/PushRegistrar";
import { SiteNav } from "@/components/SiteNav";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Geometric grotesque, the closest free match to the wordmark in the logo lockup.
const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

const SITE_URL = "https://www.couchcinemacollective.com";
const DESCRIPTION =
  "Guilds of film watchers nominate, watch, and award a season of cinema together.";

/**
 * viewport-fit=cover lets the page paint under the notch and home
 * indicator; globals.css then pads with env(safe-area-inset-*). Without
 * it iOS letterboxes the webview and the layout fights the inset.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  // Required for og:image to resolve to an absolute URL — relative ones are
  // ignored by every scraper.
  metadataBase: new URL(SITE_URL),
  title: "Couch Cinema Collective",
  description: DESCRIPTION,
  openGraph: {
    title: "Couch Cinema Collective",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Couch Cinema Collective",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Couch Cinema Collective",
    description: DESCRIPTION,
  },
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
        <header className="relative border-b border-rule bg-paper-raised">
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

            <SiteNav items={nav} authSlot={<AuthStatus />} />
          </div>
        </header>

        <PushRegistrar signedIn={signedIn} />

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
