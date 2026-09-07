/**
 * Bridge to native capability when running inside the Capacitor shell.
 *
 * Every function here is safe to call on the web — `isNative()` is false in a
 * browser and each falls back to its web equivalent. That keeps one codebase:
 * components call these, not the plugins.
 */
import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Hand a PNG to the OS share sheet on device; fall back to a download in the
 * browser. Capacitor's Share plugin needs a real file URL, so the data URL is
 * written to the cache directory first — cache, not documents, because these
 * are throwaway and shouldn't count against the user's storage or sync.
 */
export async function shareImage(
  dataUrl: string,
  filename: string,
  title: string,
): Promise<void> {
  if (!isNative()) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
    return;
  }

  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  const written = await Filesystem.writeFile({
    path: filename,
    // writeFile wants base64 without the data-URL preamble.
    data: dataUrl.split(",")[1],
    directory: Directory.Cache,
  });

  await Share.share({ title, files: [written.uri] });
}

/** Share a link — invites, a published ceremony. */
export async function shareLink(url: string, title: string): Promise<void> {
  if (isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, url });
    return;
  }

  if (navigator.share) {
    await navigator.share({ title, url });
    return;
  }
  await navigator.clipboard.writeText(url);
}

/**
 * Ask for notification permission and hand the resulting APNs token to the
 * server. No-ops on the web.
 *
 * `onOpen` receives the path carried in the payload so a tapped notification
 * lands on the right screen rather than the home page.
 */
/** Listeners are process-wide; adding them twice fires callbacks twice. */
let pushListenersAttached = false;

export async function registerPush(
  save: (token: string) => Promise<unknown>,
  onOpen?: (path: string) => void,
  onError?: (message: string) => void,
): Promise<void> {
  if (!isNative()) return;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  const status = await PushNotifications.checkPermissions();
  let granted = status.receive === "granted";
  if (!granted && status.receive === "prompt") {
    granted = (await PushNotifications.requestPermissions()).receive === "granted";
  }
  // Declining is a legitimate answer — never nag, never block the app.
  if (!granted) return;

  if (!pushListenersAttached) {
    pushListenersAttached = true;

    await PushNotifications.addListener("registration", (token) => {
      void save(token.value);
    });

    // Without this, a failed registration is completely silent — no token, no
    // error, no way to tell it apart from a user who declined.
    await PushNotifications.addListener("registrationError", (err) => {
      if (onError) onError(String(err?.error ?? "Push registration failed."));
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const path = (action.notification.data as { path?: string } | undefined)?.path;
      if (path && onOpen) onOpen(path);
    });
  }

  await PushNotifications.register();
}

/* ── Widget + Live Activity bridge (iOS) ────────────────────────────────── */

import { registerPlugin } from "@capacitor/core";

interface WidgetBridgePlugin {
  setState(options: { state: string }): Promise<void>;
  clearState(): Promise<void>;
  startActivity(options: {
    guildName: string;
    filmTitle: string;
    phaseLabel: string;
    deadline: number;
  }): Promise<{ started: boolean }>;
  endActivities(): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

export interface FestivalClockState {
  guildName: string;
  filmTitle: string;
  phaseLabel: string;
  /** Epoch ms of the phase deadline; null when the phase has no clock. */
  deadline: number | null;
  position?: number;
  filmCount?: number;
}

/** Swift's ISO-8601 decoder rejects fractional seconds — strip them. */
function isoNoMillis(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Keep the iOS surfaces in step with the dashboard: the Home/Lock Screen
 * widget always mirrors the current film, and a Live Activity runs the
 * phase countdown on the Lock Screen / Dynamic Island. No-op on the web.
 */
export async function syncFestivalClock(
  state: FestivalClockState | null,
): Promise<void> {
  if (!isNative()) return;
  try {
    if (!state) {
      await WidgetBridge.clearState();
      await WidgetBridge.endActivities();
      return;
    }
    await WidgetBridge.setState({
      state: JSON.stringify({
        guildName: state.guildName,
        filmTitle: state.filmTitle,
        phaseLabel: state.phaseLabel,
        deadline: state.deadline ? isoNoMillis(state.deadline) : undefined,
        position: state.position,
        filmCount: state.filmCount,
      }),
    });
    if (state.deadline && state.deadline > Date.now()) {
      await WidgetBridge.startActivity({
        guildName: state.guildName,
        filmTitle: state.filmTitle,
        phaseLabel: state.phaseLabel,
        deadline: state.deadline,
      });
    } else {
      await WidgetBridge.endActivities();
    }
  } catch {
    // Widgets are a courtesy; the dashboard works without them.
  }
}

/** A light tap on meaningful interactions. No-op on the web. */
export async function tapHaptic(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics are decoration.
  }
}
