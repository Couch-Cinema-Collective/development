"use client";

import { useEffect, useState } from "react";

function remaining(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return null;
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

/** Time until nominations lock. The pressure is the point (PLAN.md §4B). */
export function Countdown({ deadline }: { deadline: string }) {
  // Computed after mount so server and client markup agree on first paint.
  const [time, setTime] = useState<ReturnType<typeof remaining>>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTime(remaining(deadline));
    const id = setInterval(() => setTime(remaining(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!mounted) return <div className="h-[42px]" />;

  if (!time) {
    return (
      <p className="text-3xl font-medium uppercase tracking-tight text-signal">
        Nominations locked
      </p>
    );
  }

  const units = [
    { value: time.days, label: "Days" },
    { value: time.hours, label: "Hrs" },
    { value: time.minutes, label: "Min" },
    { value: time.seconds, label: "Sec" },
  ];

  return (
    <div className="flex items-baseline gap-5 tabular-nums">
      {units.map((unit) => (
        <div key={unit.label} className="flex items-baseline gap-1.5">
          <span className="text-3xl font-medium leading-none tracking-tight">
            {String(unit.value).padStart(2, "0")}
          </span>
          <span className="label-eyebrow">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
