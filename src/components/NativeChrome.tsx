"use client";

import { useEffect } from "react";

import { isNative } from "@/lib/native";

/** Marks <html> with .native inside the iOS shell so CSS can adapt. */
export function NativeChrome() {
  useEffect(() => {
    if (isNative()) document.documentElement.classList.add("native");
  }, []);
  return null;
}
