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

  const numberClass =
    size === "large"
      ? "text-5xl font-medium leading-none tracking-tight"
      : "text-2xl font-medium leading-none tracking-tight";

  if (!mounted) {
    return <div className={size === "large" ? "h-[52px]" : "h-[30px]"} />;
  }

  if (!time) {
    return (
      <p className="text-2xl font-medium uppercase tracking-tight text-ink-faint">
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
      className={`flex items-baseline gap-5 tabular-nums ${urgent ? "text-signal" : ""}`}
    >
      {units.map((unit) => (
        <div key={unit.label} className="flex items-baseline gap-1.5">
          <span className={numberClass}>
            {String(unit.value).padStart(2, "0")}
          </span>
          <span className="label-eyebrow">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
