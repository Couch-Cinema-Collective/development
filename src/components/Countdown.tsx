"use client";

import { useEffect, useState } from "react";

function remaining(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return null;
  return {
    total: ms,
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

/**
 * Time left in the window you are currently in.
 *
 * The clock is the dashboard's spine — a member should be able to tell what
 * they owe and how long they have from one glance at it, so the deadline is
 * rendered large and the label above it says what runs out.
 */
export function Countdown({
  deadline,
  expiredLabel = "Window closed",
  size = "large",
  /** Below this many hours the clock turns red — you are nearly out of time. */
  urgentBelowHours = 24,
}: {
  deadline: string;
  expiredLabel?: string;
  size?: "large" | "small";
  urgentBelowHours?: number;
}) {
  // Computed after mount so server and client markup agree on first paint.
  const [time, setTime] = useState<ReturnType<typeof remaining>>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTime(remaining(deadline));
    const id = setInterval(() => setTime(remaining(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  // Scales with the viewport rather than sitting at a fixed 5xl: at phone
  // width four two-digit numbers plus their labels overflowed the card and
  // bled past its border.
  const numberClass =
    size === "large"
      ? "text-[clamp(1.75rem,7vw,3rem)] font-medium leading-none tracking-tight"
      : "text-[clamp(1.25rem,4.5vw,1.5rem)] font-medium leading-none tracking-tight";

  if (!mounted) {
    return <div className={size === "large" ? "h-12" : "h-8"} />;
  }

  if (!time) {
    return (
      <p className="text-balance text-xl font-medium uppercase leading-tight tracking-tight text-ink-faint">
        {expiredLabel}
      </p>
    );
  }

  const urgent = time.total < urgentBelowHours * 3_600_000;
  const units = [
    { value: time.days, label: "Days" },
    { value: time.hours, label: "Hrs" },
    { value: time.minutes, label: "Min" },
    { value: time.seconds, label: "Sec" },
  ];

  return (
    <div
      className={`flex max-w-full flex-wrap items-baseline gap-x-4 gap-y-1 tabular-nums ${
        urgent ? "text-signal" : ""
      }`}
    >
      {units.map((unit) => (
        <div key={unit.label} className="flex shrink-0 items-baseline gap-1">
          <span className={numberClass}>
            {String(unit.value).padStart(2, "0")}
          </span>
          <span className="label-eyebrow">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
