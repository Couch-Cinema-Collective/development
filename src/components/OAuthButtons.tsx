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

export function OAuthButtons({ next = "/" }: { next?: string }) {
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
      <button
        type="button"
        onClick={() => signInWith("google")}
        className="border border-ink px-5 py-2.5 text-sm uppercase tracking-[0.1em] transition-colors hover:bg-ink hover:text-paper"
      >
        Continue with Google
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
