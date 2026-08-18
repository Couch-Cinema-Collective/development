import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Couch Cinema Collective — iOS shell.
 *
 * The app is a WKWebView pointed at the deployed site rather than a bundled
 * static export. That is deliberate: the web app is heavily server-rendered
 * (server actions, async server components, cookie auth), none of which
 * survives `next export`. Pointing at the live origin keeps one codebase and
 * means a web deploy updates the app instantly, with no App Store review for
 * UI changes.
 *
 * `webDir` is the offline fallback — the only bundled asset. It shows when the
 * device can't reach the server.
 *
 * Native capability (push, share sheet) comes from plugins over the Capacitor
 * bridge, which is injected into the remote page. That native surface is also
 * what keeps this the right side of App Store guideline 4.2 (Minimum
 * Functionality) — a bare webview wrapper gets rejected.
 */
const config: CapacitorConfig = {
  appId: "com.couchcinemacollective.app",
  appName: "Couch Cinema",
  webDir: "native/www",

  server: {
    url: "https://www.couchcinemacollective.com",
    hostname: "www.couchcinemacollective.com",
    androidScheme: "https",
    iosScheme: "https",
    // Supabase auth and TMDB imagery are loaded from the page itself; both
    // must be navigable or sign-in dead-ends inside the webview.
    allowNavigation: [
      "www.couchcinemacollective.com",
      "*.supabase.co",
      "accounts.google.com",
    ],
  },

  ios: {
    // The site paints its own background; this stops a white flash on launch.
    backgroundColor: "#f7f5f0",
    contentInset: "always",
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#e62b24",
      showSpinner: false,
    },
    PushNotifications: {
      // Season deadlines are the reason this app exists on a phone at all.
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
