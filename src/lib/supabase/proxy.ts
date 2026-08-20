import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, requireSupabaseCredentials } from "./config";

/** Routes that require a signed-in member. Everything else stays public. */
const PROTECTED_PREFIXES = [
  "/profile",
  "/festival",
  "/dashboard",
  "/nominate",
  "/welcome",
  "/guild",
];

/**
 * Runs in proxy.ts on every matched request. Refreshes the auth token if it
 * has expired and mirrors the new cookies onto both the forwarded request and
 * the response — the dance below is the documented @supabase/ssr pattern and
 * must not be reordered.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Auth is still being wired up. Until a project is configured, pass every
  // request straight through — the prototype stays fully browsable, and
  // protected routes simply aren't protected yet.
  if (!isSupabaseConfigured()) return supabaseResponse;

  const { url: supabaseUrl, key: supabaseKey } = requireSupabaseCredentials();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() (not getSession()) — it revalidates against Supabase's servers,
  // which is also what triggers the token refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
