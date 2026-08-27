/**
 * Native sign-in for the iOS shell.
 *
 * Inside the Capacitor webview, Supabase's browser OAuth dead-ends: Google
 * refuses to run OAuth in an embedded webview at all, and Apple's flow gets
 * bounced to Safari (App Store guideline 4 rejects that outright). So on
 * device the OS-native sheets run instead — AuthenticationServices for
 * Apple, the Google Sign-In SDK for Google — and the identity token they
 * return is handed to Supabase with signInWithIdToken(). The web keeps its
 * existing redirect flow; OAuthButtons branches on nativeAuthAvailable().
 */
import { isNative } from "./native";

export type NativeProvider = "apple" | "google";

/** Bundle id — Apple's token audience, which Supabase must be told to accept. */
const APPLE_BUNDLE_ID = "com.couchcinemacollective.app";

/**
 * Google needs an iOS OAuth client id (Google Cloud → Credentials → iOS
 * type, for the bundle id above). Without it the native Google button
 * falls back to the web flow — which fails in the webview — so the button
 * is hidden on device until the id is configured.
 */
const GOOGLE_IOS_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID;
/**
 * Optional: Supabase's own Google (web) client id. When set, the iOS SDK
 * mints tokens with that audience, so Supabase accepts them with no extra
 * "authorized client id" configuration.
 */
const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export function nativeAuthAvailable(provider: NativeProvider): boolean {
  if (!isNative()) return false;
  return provider === "apple" ? true : Boolean(GOOGLE_IOS_CLIENT_ID);
}

/** What signInWithIdToken() needs, plus the name Apple only reveals once. */
export interface NativeCredential {
  token: string;
  /** Raw nonce for Apple — Supabase hashes it and checks the token claim. */
  nonce?: string;
  fullName?: string;
}

/** Thrown when the person dismissed the sheet — not an error to display. */
export class NativeAuthCancelled extends Error {}

let initialised = false;

async function plugin() {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  if (!initialised) {
    await SocialLogin.initialize({
      apple: { clientId: APPLE_BUNDLE_ID },
      ...(GOOGLE_IOS_CLIENT_ID
        ? {
            google: {
              iOSClientId: GOOGLE_IOS_CLIENT_ID,
              iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
              mode: "online" as const,
            },
          }
        : {}),
    });
    initialised = true;
  }
  return SocialLogin;
}

export async function signInNatively(
  provider: NativeProvider,
): Promise<NativeCredential> {
  const SocialLogin = await plugin();

  try {
    if (provider === "apple") {
      // Apple wants the SHA-256 of the nonce in the request and echoes it in
      // the token; Supabase wants the raw nonce and does the hashing itself.
      const rawNonce = randomNonce();
      const { result } = await SocialLogin.login({
        provider: "apple",
        options: { scopes: ["email", "name"], nonce: await sha256Hex(rawNonce) },
      });
      if (!result.idToken) throw new Error("Apple returned no identity token.");
      const name = [result.profile.givenName, result.profile.familyName]
        .filter(Boolean)
        .join(" ");
      return { token: result.idToken, nonce: rawNonce, fullName: name || undefined };
    }

    const { result } = await SocialLogin.login({
      provider: "google",
      options: { scopes: ["email", "profile"] },
    });
    if (!("idToken" in result) || !result.idToken) {
      throw new Error("Google returned no identity token.");
    }
    return { token: result.idToken, fullName: result.profile?.name ?? undefined };
  } catch (e) {
    if (isCancellation(e)) throw new NativeAuthCancelled();
    throw e;
  }
}

/** Both SDKs report a dismissed sheet as an error; neither is worth showing. */
function isCancellation(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return /cancel|canceled|cancelled|1001|-5/i.test(message);
}

function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
