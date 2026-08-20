# The iOS App

Couch Cinema on iPhone, via [Capacitor](https://capacitorjs.com). Read
`capacitor.config.ts` alongside this.

## What it is

A native iOS shell around a `WKWebView` pointed at
**www.couchcinemacollective.com** — not a bundled copy of the site.

That's deliberate. The web app is heavily server-rendered: nine server-action
files, eleven async server components, cookie-based Supabase auth. None of it
survives `next export`, so there is nothing to bundle. Pointing at the live
origin means:

- **One codebase.** No second UI to keep in sync.
- **Deploys update the app instantly.** Merge to `main`, Vercel ships, the app
  picks it up on next launch — *no App Store review for UI changes.*
- Native capability still works, because the Capacitor bridge is injected into
  the remote page.

The only bundled asset is `native/www/index.html` — an offline screen shown
when the device can't reach the server.

## Prerequisites

| | Needed for | Cost |
|---|---|---|
| **Xcode** | Building, the Simulator, anything native | Free — but ~40 GB installed |
| **Apple Developer Program** | Physical devices, push, TestFlight, the App Store | $99/year |

You can build and run in the Simulator with **just Xcode**. The paid account is
only needed once you want it on a real phone.

After installing Xcode, point the command line tools at it:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

CocoaPods is **not** required — Capacitor 8 uses Swift Package Manager.

## Everyday commands

```bash
npx cap sync ios     # after changing config or adding plugins
npx cap open ios     # opens the project in Xcode
```

Then hit ▶ in Xcode with a simulator selected. Because the app loads the live
site, you do **not** need `npm run dev` running.

To point the app at a local dev server instead, change `server.url` in
`capacitor.config.ts` to your machine's LAN address (`http://192.168.x.x:3000`)
and re-run `npx cap sync ios`.

## What's built

- iOS project, bundle id `com.couchcinemacollective.app`
- App icon and splash — couch mark, white on brand red, generated from
  `assets/` via `npx capacitor-assets generate --ios`
- Offline fallback screen
- **Share sheet.** Ceremony cards hand a real PNG to iOS via
  `src/lib/native.ts`; the same call downloads the file in a browser, so
  components don't branch on platform.
- Plugins installed: App, Filesystem, Push Notifications, Share, Splash
  Screen, Status Bar

## What's left

1. **Push notifications.** The plugin is installed and configured, but nothing
   registers a device token yet, and delivery needs an APNs key — which needs
   the paid account. This is the highest-value remaining piece: the whole
   product runs on deadlines (nominations lock, voting opens, ceremony
   publishes), and right now those only reach Discord.
2. **A device-token table** so the server knows where to send.
3. **Deep links** for Supabase OAuth. Google sign-in on web is a cookie
   redirect; in a native webview it needs a registered URL scheme, or sign-in
   dead-ends. Expect this to be the first thing that breaks on a real device.
4. **Offline caching** of the current slate.

## App Store: read this before submitting

Apple's **Guideline 4.2 (Minimum Functionality)** rejects apps that are just a
website in a webview. A wrapper alone will not pass.

The mitigation is the list above — push notifications especially, plus the
share sheet and offline caching. Ship those and the app does things the mobile
site cannot, which is exactly the test Apple applies. Submitting before push
works is inviting a rejection and a wasted review cycle.

## Testing push notifications

Two halves, both testable without a phone.

### 1. Are the credentials right?

```bash
node scripts/send-test-push.mjs
```

Sends to a deliberately fake device token. Apple distinguishes a bad token
from a bad key, and that difference is the signal:

| Response | Meaning |
|---|---|
| `BadDeviceToken` | ✅ Key, key id, team id and bundle are all correct |
| `InvalidProviderToken` | ✗ `APNS_KEY`, `APNS_KEY_ID` or `APNS_TEAM_ID` is wrong |
| `TopicDisallowed` | ✗ `APNS_BUNDLE_ID` doesn't match the key's app |

Verified `BadDeviceToken` on 2026-08-19 — the server side is sound.

### 2. Does the app handle a notification?

```bash
xcrun simctl push booted com.couchcinemacollective.app payload.apns
```

Where `payload.apns` is the real APNs body plus a `Simulator Target Bundle`
key. Confirms the banner, the badge, and — if you tap it — that `path`
deep-links to the right screen.

### What still needs a real device

Simulators don't produce usable APNs device tokens, so nothing above proves
the round trip: registration writing to `device_tokens`, a season transition
firing, and the notification arriving on someone's phone.

That needs a TestFlight build, a signed-in member, and a season advanced to
VOTING. Until then the chain is proven in two halves that have never been
joined.

Production also needs the `APNS_*` variables set on the host — they are in
`.env.local` for development only.
