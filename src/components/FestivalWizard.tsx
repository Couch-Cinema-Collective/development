"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";

import { createFestival } from "@/app/festival/new/actions";
import {
  AWARD_CATALOG,
  AWARD_SUGGESTIONS,
  DEFAULT_AWARD_IDS,
} from "@/lib/mock/awards";
import { describeLength } from "@/lib/lineup";
import type { SeasonCategory } from "@/lib/mock/categories";
import {
  BEST_OF_THE_FEST,
  MAX_CUSTOM_AWARDS,
  REVIEW_MAX_CHARS,
  THEME_FAMILIES,
  UPVOTES_PER_FILM,
  type ThemeFamily,
  type Visibility,
} from "@/lib/types";

/** Catalog families, keyed by the theme family the president picks. */
const FAMILY_MAP: Record<ThemeFamily, string | null> = {
  nations: "National",
  filmmakers: "Auteur",
  genres: "Genre",
  movements: "Movement",
  eras: "Era",
  custom: null,
};

const STEPS = ["Theme", "Schedule", "Awards", "Open"];

/**
 * Festival setup, in four steps.
 *
 * Shorter than the season wizard it replaces: the slate algorithm and its two
 * weight sliders are gone, and film count is no longer a setting — one film
 * per curator means the roster decides it. What is left is what the president
 * actually chooses: what we watch, how fast, and what we hand out.
 */
export function FestivalWizard({
  guildId,
  guildName: initialGuildName,
  categories,
  curatorCount,
}: {
  guildId: string;
  guildName: string;
  categories: SeasonCategory[];
  curatorCount: number;
}) {
  const [step, setStep] = useState(0);
  const [guildName, setGuildName] = useState(initialGuildName);
  const [themeFamily, setThemeFamily] = useState<ThemeFamily>("genres");
  const [theme, setTheme] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("closed");
  const [awardIds, setAwardIds] = useState<string[]>(DEFAULT_AWARD_IDS);
  const [customAwards, setCustomAwards] = useState<string[]>([]);
  const [customDraft, setCustomDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posters, setPosters] = useState<Record<string, string | null>>({});
  const [pending, startTransition] = useTransition();

  const honoraryCount = awardIds.length + customAwards.length;

  const suggestions = useMemo(
    () =>
      AWARD_SUGGESTIONS[themeFamily].filter((s) => !customAwards.includes(s)),
    [themeFamily, customAwards],
  );

  const themeOptions = useMemo(() => {
    const family = FAMILY_MAP[themeFamily];
    if (!family) return [];
    return categories.filter((c) => c.family === family);
  }, [categories, themeFamily]);

  // Poster art is fetched per family rather than for all 113 themes at once,
  // and only once the picker is actually on screen.
  const posterFamily = FAMILY_MAP[themeFamily];
  useEffect(() => {
    if (!posterFamily) return;
    let cancelled = false;
    fetch(`/api/themes/posters?family=${encodeURIComponent(posterFamily)}`)
      .then((r) => r.json())
      .then((data: { posters?: Record<string, string | null> }) => {
        if (!cancelled && data.posters) {
          setPosters((prev) => ({ ...prev, ...data.posters }));
        }
      })
      .catch(() => {
        // A decorative image failing is not worth surfacing.
      });
    return () => {
      cancelled = true;
    };
  }, [posterFamily]);

  function toggleAward(id: string) {
    setAwardIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  function addCustom(name: string) {
    const trimmed = name.trim();
    if (!trimmed || customAwards.includes(trimmed)) return;
    if (honoraryCount >= MAX_CUSTOM_AWARDS) {
      setError(`Honorary awards are capped at ${MAX_CUSTOM_AWARDS}.`);
      return;
    }
    setError(null);
    setCustomAwards((prev) => [...prev, trimmed]);
    setCustomDraft("");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createFestival({
        guildId,
        guildName,
        theme,
        themeFamily,
        visibility,
        awardIds,
        customAwardNames: customAwards,
      });
      // A successful create redirects, so reaching here means it failed.
      if (result?.error) setError(result.error);
    });
  }

  const canAdvance =
    step === 0 ? theme.trim().length > 0 : step === 2 ? honoraryCount <= MAX_CUSTOM_AWARDS : true;

  return (
    <div>
      {/* ── Step rail ──────────────────────────────────────────────────── */}
      <ol className="flex flex-wrap gap-px border border-rule bg-rule">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`flex-1 px-5 py-3 ${
              i === step ? "bg-ink text-paper" : "bg-paper-raised"
            }`}
          >
            <span className="label-eyebrow">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="mt-1 text-sm font-medium uppercase tracking-tight">
              {label}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-10 min-h-[22rem]">
        {/* ── 1. Theme ─────────────────────────────────────────────────── */}
        {step === 0 && (
          <section>
            <h2 className="text-3xl font-medium uppercase leading-none tracking-tight">
              What are we watching?
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
              Every festival has a theme, and every curator has to find a film
              that fits it. Pick the kind of theme first.
            </p>

            <div className="mt-8 grid gap-px border border-rule bg-rule sm:grid-cols-3">
              {THEME_FAMILIES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setThemeFamily(f.id)}
                  className={`px-5 py-4 text-left transition-colors ${
                    themeFamily === f.id
                      ? "bg-ink text-paper"
                      : "bg-paper-raised hover:bg-paper"
                  }`}
                >
                  <p className="text-sm font-medium uppercase tracking-tight">
                    {f.label}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      themeFamily === f.id ? "text-paper/60" : "text-ink-faint"
                    }`}
                  >
                    {f.example}
                  </p>
                </button>
              ))}
            </div>

            <label
              htmlFor="theme"
              className="label-eyebrow mt-10 block border-b border-rule pb-2"
            >
              Name the festival
            </label>
            <input
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={
                THEME_FAMILIES.find((f) => f.id === themeFamily)?.example
              }
              className="mt-4 w-full border border-rule bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
            />

            {themeOptions.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-2">
                  <p className="label-eyebrow">Or take one from the collection</p>
                  <p className="label-eyebrow">{themeOptions.length} to choose from</p>
                </div>

                <ul className="mt-4 grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-4">
                  {themeOptions.map((c) => {
                    const chosen = theme === c.name;
                    const poster = posters[c.id];
                    return (
                      <li key={c.id} className="bg-paper-raised">
                        <button
                          type="button"
                          onClick={() => setTheme(c.name)}
                          title={c.blurb}
                          className={`flex w-full flex-col text-left transition-colors ${
                            chosen ? "bg-ink text-paper" : "hover:bg-paper"
                          }`}
                        >
                          <span className="relative block aspect-[2/3] w-full overflow-hidden bg-ink/5">
                            {poster ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w342${poster}`}
                                alt=""
                                fill
                                sizes="(max-width: 640px) 50vw, 25vw"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center px-2 text-center text-xs uppercase tracking-[0.1em] text-ink-faint">
                                {c.exemplars[0] ?? c.name}
                              </span>
                            )}
                            {chosen && (
                              <span className="absolute inset-0 flex items-center justify-center bg-signal/85 text-xs font-medium uppercase tracking-[0.14em] text-paper">
                                Chosen
                              </span>
                            )}
                          </span>
                          <span className="block px-3 py-2.5 text-xs font-medium uppercase leading-tight tracking-tight">
                            {c.name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <label
              htmlFor="guild-name"
              className="label-eyebrow mt-10 block border-b border-rule pb-2"
            >
              Guild name
            </label>
            <input
              id="guild-name"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              className="mt-4 w-full border border-rule bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
            />
          </section>
        )}

        {/* ── 2. Schedule ──────────────────────────────────────────────── */}
        {step === 1 && (
          <section>
            <h2 className="text-3xl font-medium uppercase leading-none tracking-tight">
              The schedule
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
              Every festival runs the same rhythm, anchored to Pacific time, so
              the guild always knows what is due and when. You choose when it
              starts; the calendar does the rest.
            </p>

            <ol className="mt-8 grid gap-px border border-rule bg-rule">
              {[
                {
                  label: "The first film",
                  when: "Opens the moment you open the festival",
                  note: "Screens until midnight at the end of the second Sunday.",
                },
                {
                  label: "Watch and write",
                  when: "Two full weekends",
                  note: `Reviews are filed during the viewing window — ${REVIEW_MAX_CHARS} characters, and they close when voting opens.`,
                },
                {
                  label: "Critics vote",
                  when: "Monday to Wednesday",
                  note: `Reviews go up anonymously and every critic spends ${UPVOTES_PER_FILM} upvotes. Closes Wednesday midnight.`,
                },
                {
                  label: "The next film",
                  when: "Thursday morning",
                  note: "Ten days to the following Sunday, then Monday to Wednesday again — a fortnight per film, every film.",
                },
              ].map((row) => (
                <li key={row.label} className="bg-paper-raised px-6 py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-lg font-medium uppercase tracking-tight">
                      {row.label}
                    </p>
                    <p className="label-eyebrow text-signal">{row.when}</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
                    {row.note}
                  </p>
                </li>
              ))}
            </ol>

            <p className="mt-5 text-sm text-ink-soft">
              With {curatorCount} curator{curatorCount === 1 ? "" : "s"} seated,
              that runs{" "}
              <strong className="font-medium">
                {describeLength(Math.max(1, curatorCount))}
              </strong>
              .
            </p>

            <h3 className="label-eyebrow mt-10 block border-b border-rule pb-2">
              Who can join
            </h3>
            <div className="mt-4 grid gap-px border border-rule bg-rule sm:grid-cols-2">
              {(
                [
                  {
                    id: "closed" as const,
                    label: "Closed",
                    note: "Invite-only, by code. Your guild, your people.",
                  },
                  {
                    id: "open" as const,
                    label: "Open",
                    note: "Strangers can find it and take a free curator seat.",
                  },
                ]
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVisibility(v.id)}
                  className={`px-5 py-4 text-left transition-colors ${
                    visibility === v.id
                      ? "bg-ink text-paper"
                      : "bg-paper-raised hover:bg-paper"
                  }`}
                >
                  <p className="text-sm font-medium uppercase tracking-tight">
                    {v.label}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      visibility === v.id ? "text-paper/60" : "text-ink-faint"
                    }`}
                  >
                    {v.note}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── 3. Awards ────────────────────────────────────────────────── */}
        {step === 2 && (
          <section>
            <h2 className="text-3xl font-medium uppercase leading-none tracking-tight">
              What do we hand out?
            </h2>

            <div className="mt-6 border border-ink bg-paper-raised px-5 py-4">
              <p className="label-eyebrow text-signal">Always on</p>
              <p className="mt-1.5 text-lg font-medium uppercase tracking-tight">
                {BEST_OF_THE_FEST}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                The only award that scores. Winning it wins the festival for the
                curator who put the film up.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-2">
              <h3 className="label-eyebrow">Honorary awards</h3>
              <p className="label-eyebrow">
                {honoraryCount} of {MAX_CUSTOM_AWARDS}
              </p>
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              Real trophies, no points. They show on a curator&apos;s profile and
              change nothing.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {AWARD_CATALOG.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAward(a.id)}
                  className={`border px-3 py-2 text-xs uppercase tracking-[0.1em] transition-colors ${
                    awardIds.includes(a.id)
                      ? "border-ink bg-ink text-paper"
                      : "border-rule hover:border-ink"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>

            {suggestions.length > 0 && (
              <div className="mt-8">
                <p className="label-eyebrow">
                  Suggested for a {themeFamily} festival
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addCustom(s)}
                      className="border border-dashed border-rule px-3 py-2 text-xs uppercase tracking-[0.1em] transition-colors hover:border-signal hover:text-signal"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8">
              <label htmlFor="custom-award" className="label-eyebrow">
                Make one up
              </label>
              <div className="mt-3 flex flex-wrap gap-3">
                <input
                  id="custom-award"
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom(customDraft);
                    }
                  }}
                  placeholder="Best Needle Drop"
                  className="min-w-0 flex-1 border border-rule bg-paper px-4 py-3 text-sm outline-none focus:border-ink"
                />
                <button
                  type="button"
                  onClick={() => addCustom(customDraft)}
                  className="border border-ink px-6 py-3 text-xs font-medium uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper"
                >
                  Add
                </button>
              </div>

              {customAwards.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {customAwards.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomAwards((prev) =>
                            prev.filter((n) => n !== name),
                          )
                        }
                        className="border border-signal px-3 py-2 text-xs uppercase tracking-[0.1em] text-signal transition-colors hover:bg-signal hover:text-paper"
                      >
                        {name} ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* ── 4. Open ──────────────────────────────────────────────────── */}
        {step === 3 && (
          <section>
            <h2 className="text-3xl font-medium uppercase leading-none tracking-tight">
              Ready
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
              This creates the festival. Nominations don&apos;t open until you
              say so from the guild page — one button, when your curators are
              seated.
            </p>

            <dl className="mt-8 grid gap-px border border-rule bg-rule">
              {[
                { label: "Theme", value: theme || "—" },
                {
                  label: "Kind",
                  value:
                    THEME_FAMILIES.find((f) => f.id === themeFamily)?.label ??
                    "",
                },
                { label: "Pace", value: "A fortnight a film" },
                {
                  label: "Runs",
                  value: describeLength(Math.max(1, curatorCount)),
                },
                {
                  label: "Lineup",
                  value: `${curatorCount} film${curatorCount === 1 ? "" : "s"} — one per curator`,
                },
                {
                  label: "Joining",
                  value: visibility === "open" ? "Open" : "Invite-only",
                },
                {
                  label: "Awards",
                  value: `${BEST_OF_THE_FEST} + ${honoraryCount} honorary`,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex flex-wrap items-baseline justify-between gap-4 bg-paper-raised px-6 py-4"
                >
                  <dt className="label-eyebrow">{row.label}</dt>
                  <dd className="text-sm font-medium tracking-tight">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      {error && (
        <p className="mt-6 border border-signal bg-paper-raised px-4 py-3 text-sm text-signal">
          {error}
        </p>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
          className="border border-rule px-6 py-3 text-sm font-medium uppercase tracking-[0.14em] transition-colors hover:border-ink disabled:opacity-30"
        >
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
            className="bg-ink px-8 py-3 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-signal disabled:opacity-30"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={pending || !theme.trim()}
            className="bg-signal px-8 py-3 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink disabled:opacity-40"
          >
            {pending ? "Creating…" : "Create the festival"}
          </button>
        )}
      </div>
    </div>
  );
}
