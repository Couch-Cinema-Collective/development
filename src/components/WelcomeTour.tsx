"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  BEST_OF_THE_FEST,
  REVIEW_MAX_CHARS,
  UPVOTES_PER_FILM,
  VOICE_OF_THE_PEOPLE,
  type GuildRole,
} from "@/lib/types";

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  points?: string[];
}

/**
 * What a member is shown once, the first time they arrive.
 *
 * Deliberately role-aware: a critic being walked through drawing a lineup
 * learns nothing useful, and a president who is never told how upvotes work
 * cannot explain the game to the people they just recruited. Everyone gets the
 * shared rules; the last slide is the one that differs.
 */
function slidesFor(role: GuildRole): Slide[] {
  const shared: Slide[] = [
    {
      eyebrow: "The shape of it",
      title: "A festival, not a poll",
      body: "Your guild programmes a set of films, watches them one at a time on a shared clock, and finishes with an awards ceremony. Everyone watches everything.",
      points: [
        "Curators each put up one film — that is the lineup",
        "Critics are the voting body, and every curator is a critic too",
        "One film at a time, in a random order",
      ],
    },
    {
      eyebrow: "The rhythm",
      title: "Watch, write, vote",
      body: "Each film runs the same three windows in turn. Miss a window and you miss that round — that is the whole eligibility system.",
      points: [
        "A fortnight to watch it",
        `Two days to write ${REVIEW_MAX_CHARS} characters on it`,
        `Twenty-four hours to spend ${UPVOTES_PER_FILM} upvotes on other people's reviews`,
      ],
    },
    {
      eyebrow: "How points work",
      title: "Reviews are anonymous",
      body: `Nobody sees who wrote what until a film's voting window shuts, so you upvote the writing rather than the writer. You must spend all ${UPVOTES_PER_FILM} upvotes on a film, or your own review stops being eligible to receive any.`,
      points: [
        "Upvotes you earn are your score as a critic",
        `Most upvotes across the festival takes ${VOICE_OF_THE_PEOPLE}`,
        "Curators compete for it too — the writing stands on its own",
      ],
    },
  ];

  if (role === "critic") {
    return [
      ...shared,
      {
        eyebrow: "Your job",
        title: "You decide it",
        body: "You do not put up a film, so you are not in the running for the festival award — but you are the reason there is a result at all. Every award is decided by your ballot.",
        points: [
          "Watch each film and write it up before its window shuts",
          `Spend all ${UPVOTES_PER_FILM} upvotes on every film`,
          `Win ${VOICE_OF_THE_PEOPLE} by being the sharpest writer`,
          "Want to programme? Take a curator seat if one is free",
        ],
      },
    ];
  }

  const curatorSlide: Slide = {
    eyebrow: "How curators win",
    title: "Back a film, defend it",
    body: `You put up exactly one film. If it takes ${BEST_OF_THE_FEST}, you win the festival — that is the only award that scores, and it goes on your record permanently.`,
    points: [
      "Pick your film, then lock it in to submit it",
      "Locked films only — an unlocked pick misses the lineup",
      "Every other award is honorary: real trophies, no points",
      "You still watch, review, and vote on everything, your own film included",
    ],
  };

  if (role === "president") {
    return [
      ...shared,
      curatorSlide,
      {
        eyebrow: "Running it",
        title: "You set the pace",
        body: "As president you decide what the guild watches and how fast, then move the festival along one step at a time. You will only ever be shown the one thing it is waiting on.",
        points: [
          "Set the theme, the cadence, and how many curator seats exist",
          "Curator seats fill first come first served — you do not approve them",
          "Draw the lineup once curators have locked in",
          "Open the festival to start the clock, then publish the ceremony at the end",
        ],
      },
    ];
  }

  return [...shared, curatorSlide];
}

const STORAGE_PREFIX = "ccc-tour-seen";

/** localStorage never changes underneath us — only close() writes to it. */
const noopSubscribe = () => () => {};

export function WelcomeTour({ role }: { role: GuildRole }) {
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);

  const slides = slidesFor(role);
  // Keyed by role: someone who joins as a critic and later takes a curator
  // seat has genuinely new rules to learn.
  const storageKey = `${STORAGE_PREFIX}:${role}`;

  // Read through useSyncExternalStore rather than an effect, so there is no
  // setState-on-mount and no hydration mismatch. The server snapshot says
  // "already seen", which keeps the modal from flashing during hydration.
  const seen = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return window.localStorage.getItem(storageKey) !== null;
      } catch {
        // Private browsing and blocked storage just mean no tour.
        return true;
      }
    },
    () => true,
  );

  const open = !seen && !dismissed;

  function close() {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Nothing to do — it will show again next time, which is survivable.
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const slide = slides[index];
  const last = index === slides.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/70 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-ink bg-paper-raised">
        <div className="flex items-center justify-between border-b border-rule px-6 py-4">
          <p className="label-eyebrow text-signal">{slide.eyebrow}</p>
          <button
            type="button"
            onClick={close}
            className="label-eyebrow transition-colors hover:text-signal"
          >
            Skip
          </button>
        </div>

        <div className="px-6 py-7">
          <h2
            id="tour-title"
            className="text-balance text-3xl font-medium uppercase leading-none tracking-tight"
          >
            {slide.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            {slide.body}
          </p>

          {slide.points && (
            <ul className="mt-6 grid gap-2.5">
              {slide.points.map((point) => (
                <li key={point} className="flex items-baseline gap-3 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-rule px-6 py-4">
          <div className="flex gap-1.5" aria-hidden>
            {slides.map((s, i) => (
              <span
                key={s.title}
                className={`h-1 w-7 ${i === index ? "bg-signal" : "bg-rule"}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="border border-rule px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors hover:border-ink"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? close() : setIndex((i) => i + 1))}
              className="bg-signal px-6 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink"
            >
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
