"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy Link",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="border border-ink px-3.5 py-1.5 text-xs uppercase tracking-[0.1em] transition-colors hover:bg-ink hover:text-paper"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
