"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Google + Facebook sign-in. OAuth has to start in the browser (Supabase
 * redirects to the provider), so this is a client component; the session
 * lands server-side via /auth/callback.
 */

// Flip to true once the Meta app is live and the provider is enabled in
// Supabase (Authentication → Sign In / Providers → Facebook).
const FACEBOOK_ENABLED = false;

export function OAuthButtons({ next = "/welcome" }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);

  async function signInWith(provider: "google" | "facebook") {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) setError(error.message);
    } catch (e) {
      // Most likely: Supabase env vars not filled in yet.
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    }
  }

  return (
    <div className="grid gap-3">
      {/* Styled to Google's sign-in branding guidelines: white field,
          #747775 border, the official multicolor G, sentence-case label. */}
      <button
        type="button"
        onClick={() => signInWith("google")}
        className="flex items-center justify-center gap-3 border border-[#747775] bg-white px-5 py-2.5 text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-[#f8f9fa]"
      >
        <GoogleG />
        Sign in with Google
      </button>
      {FACEBOOK_ENABLED && (
        <button
          type="button"
          onClick={() => signInWith("facebook")}
          className="border border-ink px-5 py-2.5 text-sm uppercase tracking-[0.1em] transition-colors hover:bg-ink hover:text-paper"
        >
          Continue with Facebook
        </button>
      )}
      {error && <p className="text-sm text-signal">{error}</p>}
    </div>
  );
}

/** The official four-color G, inlined so no external asset is needed. */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
