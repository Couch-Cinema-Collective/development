"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { isNative } from "@/lib/native";

/**
 * The Film Collection is web-only. Inside the iOS shell, any /wiki URL
 * (deep link, stale history) lands on the member's welcome page instead.
 */
export function NativeRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (isNative()) router.replace("/welcome");
  }, [router]);
  return null;
}
