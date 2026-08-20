"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { registerDeviceToken } from "@/app/push-actions";
import { registerPush } from "@/lib/native";

/**
 * Registers this device for push once, on launch. Renders nothing.
 *
 * Mounted in the root layout so it runs wherever a signed-in member lands,
 * and skipped entirely on the web — `registerPush` no-ops off-device.
 */
export function PushRegistrar({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();

  useEffect(() => {
    // A token is only useful once we know who it belongs to.
    if (!signedIn) return;

    void registerPush(
      (token) => registerDeviceToken(token),
      (path) => router.push(path),
    );
  }, [signedIn, router]);

  return null;
}
