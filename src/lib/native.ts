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
export async function registerPush(
  save: (token: string) => Promise<unknown>,
  onOpen?: (path: string) => void,
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

  await PushNotifications.addListener("registration", (token) => {
    void save(token.value);
  });

  await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const path = (action.notification.data as { path?: string } | undefined)?.path;
    if (path && onOpen) onOpen(path);
  });

  await PushNotifications.register();
}
