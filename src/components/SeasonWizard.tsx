"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { createSeason } from "@/app/commissioner/new/actions";

import { CommunicationStep } from "./CommunicationStep";
import { buildPool, selectSlate } from "@/lib/slate";
import {
  AWARD_CATALOG,
  DEFAULT_AWARD_IDS,
  MAX_SEASON_FILMS,
  SEASON_PRESETS,
} from "@/lib/mock/awards";
import {
  CATEGORY_FAMILIES,
  SEASON_CATEGORIES,
  type CategoryFamily,
} from "@/lib/mock/categories";
import { EXISTING_NOMINATIONS } from "@/lib/mock/guild";
import {
  MAX_AWARD_CATEGORIES,
  type AwardCategory,
  type Film,
} from "@/lib/types";

const STEPS = [
  "Identity",
  "Format",
  "Awards",
  "Weighting",
  "Communication",
] as const;

export function SeasonWizard({
  catalog,
  guildId,
  guildName: initialGuildName,
}: {
  catalog: Film[];
  guildId: string;
  guildName: string;
}) {
  const [step, setStep] = useState(0);

  const [guildName, setGuildName] = useState(initialGuildName);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  /** A season theme of the guild's own invention (design review). */
  const [customCategory, setCustomCategory] = useState("");
  const [presetId, setPresetId] = useState("standard");
  const [customFilmCount, setCustomFilmCount] = useState(6);
  const [customDuration, setCustomDuration] = useState("Two months");
  const [awardIds, setAwardIds] = useState<string[]>(DEFAULT_AWARD_IDS);
  const [customAwards, setCustomAwards] = useState<AwardCategory[]>([]);
  const [customDraft, setCustomDraft] = useState("");
  /** Percentage weight on the guild's own conviction; critic takes the rest. */
  const [guildWeight, setGuildWeight] = useState(80);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const category = SEASON_CATEGORIES.find((c) => c.id === categoryId) ?? null;
  // A typed custom theme beats a card selection.
  const categoryName = customCategory.trim() || category?.name || "";
  const preset = SEASON_PRESETS.find((p) => p.id === presetId) ?? SEASON_PRESETS[0];
  const filmCount = presetId === "custom" ? customFilmCount : preset.filmCount;
  const totalAwards = awardIds.length + customAwards.length;

  const canAdvance =
    step === 0 ? Boolean(categoryName && guildName.trim()) : true;

  function openSeason() {
    if (!categoryName) return;
    setError(null);
    startTransition(async () => {
      // On success the action redirects to the guild page; only errors return.
      const result = await createSeason({
        guildId,
        guildName,
        categoryName,
        presetId,
        customFilmCount,
        awardIds,
        customAwardNames: customAwards.map((a) => a.name),
        guildWeight,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[200px_1fr]">
      <StepRail step={step} onSelect={setStep} canAdvance={canAdvance} />

      <div className="min-w-0">
        {step === 0 && (
          <IdentityStep
            guildName={guildName}
            onGuildName={setGuildName}
            categoryId={categoryId}
            onCategory={(id) => {
              setCategoryId(id);
              setCustomCategory("");
            }}
            customCategory={customCategory}
            onCustomCategory={(v) => {
              setCustomCategory(v);
              if (v.trim()) setCategoryId(null);
            }}
          />
        )}

        {step === 1 && (
          <FormatStep
            presetId={presetId}
            onPreset={setPresetId}
            customFilmCount={customFilmCount}
            onCustomFilmCount={setCustomFilmCount}
            customDuration={customDuration}
            onCustomDuration={setCustomDuration}
          />
        )}

        {step === 2 && (
          <AwardsStep
            awardIds={awardIds}
            onToggle={(id) =>
              setAwardIds((prev) =>
                prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
              )
            }
            customAwards={customAwards}
            customDraft={customDraft}
            onCustomDraft={setCustomDraft}
            onAddCustom={() => {
              const name = customDraft.trim();
              if (!name || totalAwards >= MAX_AWARD_CATEGORIES) return;
              setCustomAwards((prev) => [
                ...prev,
                { id: `custom-${Date.now()}`, name, tier: "custom" },
              ]);
              setCustomDraft("");
            }}
            onRemoveCustom={(id) =>
              setCustomAwards((prev) => prev.filter((a) => a.id !== id))
            }
            total={totalAwards}
          />
        )}

        {step === 3 && (
          <WeightingStep
            guildWeight={guildWeight}
            onGuildWeight={setGuildWeight}
            filmCount={filmCount}
            catalog={catalog}
          />
        )}

        {step === 4 && (
          <section>
            <StepHeading
              title="Keep the guild posted"
              blurb="Optional, and skippable. Pick how your guild talks — we recommend wiring up Discord so announcements post themselves, but a group text or an email thread works too."
            />
            <CommunicationStep
              guildId={guildId}
              guildName={guildName}
              categoryName={categoryName}
            />
          </section>
        )}

        <nav className="mt-12 flex items-center justify-between border-t border-rule pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="label-eyebrow transition-colors hover:text-ink disabled:opacity-30"
          >
            ← Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="bg-ink px-7 py-3.5 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-signal disabled:opacity-30 disabled:hover:bg-ink"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={openSeason}
              disabled={pending || !categoryName}
              className="bg-signal px-7 py-3.5 text-sm font-medium uppercase tracking-[0.14em] text-paper transition-colors hover:bg-ink disabled:opacity-30"
            >
              {pending ? "Opening…" : "Open the season"}
            </button>
          )}
        </nav>

        {error && <p className="mt-4 text-right text-sm text-signal">{error}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StepRail({
  step,
  onSelect,
  canAdvance,
}: {
  step: number;
  onSelect: (n: number) => void;
  canAdvance: boolean;
}) {
  return (
    <ol className="flex gap-6 lg:sticky lg:top-8 lg:h-fit lg:flex-col lg:gap-0">
      {STEPS.map((label, index) => {
        const active = index === step;
        const reachable = index <= step || canAdvance;

        return (
          <li key={label} className="lg:border-b lg:border-rule">
            <button
              type="button"
              onClick={() => reachable && onSelect(index)}
              disabled={!reachable}
              className={`w-full py-3 text-left transition-opacity disabled:opacity-30 ${
                active ? "" : "opacity-50 hover:opacity-100"
              }`}
            >
              <span className="label-eyebrow block">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={`mt-1 block text-sm uppercase tracking-tight ${
                  active ? "font-medium text-signal" : ""
                }`}
              >
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepHeading({ title, blurb }: { title: string; blurb: string }) {
  return (
    <header className="mb-8">
      <h2 className="text-3xl font-medium uppercase leading-none tracking-tight">
        {title}
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">{blurb}</p>
    </header>
  );
}

function IdentityStep({
  guildName,
  onGuildName,
  categoryId,
  onCategory,
  customCategory,
  onCustomCategory,
}: {
  guildName: string;
  onGuildName: (v: string) => void;
  categoryId: string | null;
  onCategory: (id: string) => void;
  customCategory: string;
  onCustomCategory: (v: string) => void;
}) {
  const [family, setFamily] = useState<CategoryFamily | "All">("All");
  const visible =
    family === "All"
      ? SEASON_CATEGORIES
      : SEASON_CATEGORIES.filter((c) => c.family === family);

  return (
    <section>
      <StepHeading
        title="Name it"
        blurb="Your guild keeps its name across seasons. The category is what this season is about — members will see its description when they nominate."
      />

      <label className="label-eyebrow block" htmlFor="guild-name">
        Guild name
      </label>
      <input
        id="guild-name"
        value={guildName}
        onChange={(e) => onGuildName(e.target.value)}
        className="mt-3 w-full max-w-md border-b border-ink bg-transparent pb-3 text-2xl tracking-tight outline-none focus:border-signal"
      />

      <div className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h3 className="label-eyebrow">Season category</h3>
          <div className="flex gap-3 text-xs text-ink-faint">
            <span className="border border-rule px-2.5 py-1">
              Take the quiz — not yet built
            </span>
            <span className="border border-rule px-2.5 py-1">
              Guild collections — not yet built
            </span>
          </div>
        </div>

        <ul className="mt-5 flex flex-wrap gap-2">
          {(["All", ...CATEGORY_FAMILIES] as const).map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => setFamily(option)}
                className={`border px-3.5 py-1.5 text-xs uppercase tracking-[0.1em] transition-colors ${
                  family === option
                    ? "border-ink bg-ink text-paper"
                    : "border-rule hover:border-ink"
                }`}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>

        <ul className="mt-5 grid max-h-[32rem] gap-px overflow-y-auto border border-rule bg-rule sm:grid-cols-2">
          {visible.map((cat) => {
            const selected = cat.id === categoryId;
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onCategory(cat.id)}
                  className={`h-full w-full px-5 py-5 text-left transition-colors ${
                    selected ? "bg-ink text-paper" : "bg-paper-raised hover:bg-paper"
                  }`}
                >
                  <span
                    className={`label-eyebrow ${selected ? "text-paper/50" : ""}`}
                  >
                    {cat.family}
                  </span>
                  <span className="mt-1.5 block text-lg uppercase tracking-tight">
                    {cat.name}
                  </span>
                  <span
                    className={`mt-2 block text-xs leading-relaxed ${
                      selected ? "text-paper/75" : "text-ink-soft"
                    }`}
                  >
                    {cat.blurb}
                  </span>
                  <span
                    className={`mt-3 block text-xs ${
                      selected ? "text-paper/50" : "text-ink-faint"
                    }`}
                  >
                    {cat.exemplars.join(" · ")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-xs text-ink-faint">
          {SEASON_CATEGORIES.length} categories. Every one has a page in the{" "}
          <Link href="/wiki" className="underline hover:text-ink">
            film collection
          </Link>
          .
        </p>

        <div className="mt-8 border-t border-rule pt-6">
          <label className="label-eyebrow block" htmlFor="custom-category">
            Or invent your own
          </label>
          <input
            id="custom-category"
            value={customCategory}
            onChange={(e) => onCustomCategory(e.target.value)}
            placeholder="Heist Movies, One-Location Thrillers, 1999…"
            className={`mt-3 w-full max-w-md border-b bg-transparent pb-3 text-xl tracking-tight outline-none placeholder:text-ink-faint focus:border-signal ${
              customCategory.trim() ? "border-signal" : "border-ink"
            }`}
          />
          <p className="mt-2 text-xs text-ink-faint">
            Typing here overrides the picks above — the season is whatever you
            say it is.
          </p>
        </div>
      </div>
    </section>
  );
}

function FormatStep({
  presetId,
  onPreset,
  customFilmCount,
  onCustomFilmCount,
  customDuration,
  onCustomDuration,
}: {
  presetId: string;
  onPreset: (id: string) => void;
  customFilmCount: number;
  onCustomFilmCount: (n: number) => void;
  customDuration: string;
  onCustomDuration: (v: string) => void;
}) {
  const customSelected = presetId === "custom";

  return (
    <section>
      <StepHeading
        title="Set the clock"
        blurb="How long the season runs and how many films make the slate. The presets are suggestions — set your own pace if none fit. Members watch on their own time."
      />

      <ul className="grid gap-px border border-rule bg-rule">
        {SEASON_PRESETS.map((preset) => {
          const selected = preset.id === presetId;
          return (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => onPreset(preset.id)}
                className={`flex w-full items-center justify-between gap-6 px-6 py-6 text-left transition-colors ${
                  selected ? "bg-ink text-paper" : "bg-paper-raised hover:bg-paper"
                }`}
              >
                <span>
                  <span className="block text-lg uppercase tracking-tight">
                    {preset.label}
                  </span>
                  <span
                    className={`mt-1 block text-xs ${
                      selected ? "text-paper/70" : "text-ink-faint"
                    }`}
                  >
                    {preset.note}
                  </span>
                </span>
                <span className="shrink-0 text-3xl font-medium tabular-nums">
                  {preset.filmCount}
                </span>
              </button>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={() => onPreset("custom")}
            className={`flex w-full items-center justify-between gap-6 px-6 py-6 text-left transition-colors ${
              customSelected ? "bg-ink text-paper" : "bg-paper-raised hover:bg-paper"
            }`}
          >
            <span>
              <span className="block text-lg uppercase tracking-tight">
                Set your own pace
              </span>
              <span
                className={`mt-1 block text-xs ${
                  customSelected ? "text-paper/70" : "text-ink-faint"
                }`}
              >
                Any length, up to {MAX_SEASON_FILMS} films.
              </span>
            </span>
            <span className="shrink-0 text-3xl font-medium tabular-nums">
              {customSelected ? customFilmCount : "?"}
            </span>
          </button>
        </li>
      </ul>

      {customSelected && (
        <div className="mt-6 grid gap-6 border border-ink bg-paper-raised p-6 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="label-eyebrow">Films on the slate</span>
            <input
              type="number"
              min={1}
              max={MAX_SEASON_FILMS}
              value={customFilmCount}
              onChange={(e) =>
                onCustomFilmCount(
                  Math.max(
                    1,
                    Math.min(MAX_SEASON_FILMS, Number(e.target.value) || 1),
                  ),
                )
              }
              className="border-b border-ink bg-transparent pb-2 text-2xl tabular-nums outline-none focus:border-signal"
            />
            <span className="text-xs text-ink-faint">
              Hard cap: {MAX_SEASON_FILMS}. No guild should be judging more
              than that.
            </span>
          </label>

          <label className="grid gap-2">
            <span className="label-eyebrow">How long</span>
            <input
              value={customDuration}
              onChange={(e) => onCustomDuration(e.target.value)}
              placeholder="Two months"
              className="border-b border-ink bg-transparent pb-2 text-2xl tracking-tight outline-none placeholder:text-ink-faint focus:border-signal"
            />
            <span className="text-xs text-ink-faint">
              In your own words — the deadline pressure is social, not
              automated.
            </span>
          </label>
        </div>
      )}

      <p className="mt-6 max-w-lg text-xs leading-relaxed text-ink-faint">
        A tie at the slate cutoff expands the season by a film rather than
        dropping someone&apos;s pick, so the final count can run one higher.
      </p>
    </section>
  );
}

function AwardsStep({
  awardIds,
  onToggle,
  customAwards,
  customDraft,
  onCustomDraft,
  onAddCustom,
  onRemoveCustom,
  total,
}: {
  awardIds: string[];
  onToggle: (id: string) => void;
  customAwards: AwardCategory[];
  customDraft: string;
  onCustomDraft: (v: string) => void;
  onAddCustom: () => void;
  onRemoveCustom: (id: string) => void;
  total: number;
}) {
  const atCap = total >= MAX_AWARD_CATEGORIES;

  return (
    <section>
      <StepHeading
        title="Choose the awards"
        blurb="Set up front, announced in this order at the ceremony. Best Picture is always last and cannot be switched off."
      />

      <div className="flex items-baseline justify-between">
        <h3 className="label-eyebrow">Catalog</h3>
        <span
          className={`text-sm tabular-nums ${atCap ? "text-signal" : "text-ink-faint"}`}
        >
          {total} / {MAX_AWARD_CATEGORIES}
        </span>
      </div>

      <ul className="mt-4 grid gap-px border border-rule bg-rule sm:grid-cols-2">
        {AWARD_CATALOG.map((award) => {
          const on = award.locked || awardIds.includes(award.id);
          const disabled = award.locked || (!on && atCap);

          return (
            <li key={award.id}>
              <button
                type="button"
                onClick={() => !disabled && onToggle(award.id)}
                disabled={disabled}
                className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm transition-colors ${
                  on ? "bg-ink text-paper" : "bg-paper-raised hover:bg-paper"
                } ${disabled && !award.locked ? "opacity-40" : ""}`}
              >
                <span className="uppercase tracking-[0.06em]">{award.name}</span>
                {award.locked ? (
                  <span className="label-eyebrow shrink-0 text-paper/50">
                    Locked
                  </span>
                ) : (
                  <span
                    className={`size-4 shrink-0 border ${
                      on ? "border-paper bg-signal" : "border-ink-faint"
                    }`}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-10">
        <h3 className="label-eyebrow">Custom awards</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            value={customDraft}
            onChange={(e) => onCustomDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddCustom()}
            placeholder="Most Unnecessary Voiceover…"
            disabled={atCap}
            className="min-w-0 flex-1 border-b border-ink bg-transparent pb-2 outline-none placeholder:text-ink-faint focus:border-signal disabled:opacity-40"
          />
          <button
            type="button"
            onClick={onAddCustom}
            disabled={atCap || !customDraft.trim()}
            className="border border-ink px-5 py-2 text-sm uppercase tracking-[0.1em] transition-colors hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            Add
          </button>
        </div>

        {customAwards.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {customAwards.map((award) => (
              <li key={award.id}>
                <button
                  type="button"
                  onClick={() => onRemoveCustom(award.id)}
                  className="group flex items-center gap-2 bg-signal px-3 py-1.5 text-xs uppercase tracking-[0.08em] text-paper"
                >
                  {award.name}
                  <span className="opacity-60 group-hover:opacity-100">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {atCap && (
          <p className="mt-4 text-xs text-signal">
            Twenty is the ceiling. Switch something off to add another.
          </p>
        )}
      </div>
    </section>
  );
}

function WeightingStep({
  guildWeight,
  onGuildWeight,
  filmCount,
  catalog,
}: {
  guildWeight: number;
  onGuildWeight: (v: number) => void;
  filmCount: number;
  catalog: Film[];
}) {
  const weights = useMemo(
    () => ({ guild: guildWeight / 100, critic: 1 - guildWeight / 100 }),
    [guildWeight],
  );

  const films = useMemo(() => new Map(catalog.map((f) => [f.id, f])), [catalog]);

  // Previewed against a real past pool — at creation time this season has no
  // nominations of its own yet.
  const pool = useMemo(
    () => buildPool(EXISTING_NOMINATIONS, films, weights),
    [films, weights],
  );
  const slate = useMemo(() => selectSlate(pool, filmCount), [pool, filmCount]);
  const slateIds = new Set(slate.map((entry) => entry.film.id));

  return (
    <section>
      <StepHeading
        title="Weight the slate"
        blurb="Everyone nominates, and the top films become the season. This slider decides what counts as the top."
      />

      {/* Plain-language explainer, above the fold and above the slider. */}
      <div className="mb-6 max-w-lg space-y-3 text-sm leading-relaxed text-ink-soft">
        <p>
          When nominations lock, films are ranked to pick the slate. Two
          things feed that ranking: <strong>how many points your guild put
          on a film</strong>, and <strong>what critics scored it</strong>{" "}
          (TMDB, IMDb, Rotten Tomatoes).
        </p>
        <p>
          The default is 80/20 — the guild&apos;s conviction does most of the
          talking, with critics as a nudge. That nudge helps when the guild
          doesn&apos;t know a category deep: the beloved-but-obscure picks
          with huge critic scores get a fair shot at the slate. Slide to
          100% and critics are ignored entirely; slide down and they matter
          more.
        </p>
      </div>

      <div className="border border-ink bg-paper-raised p-6">
        <div className="flex items-baseline justify-between">
          <span className="label-eyebrow">Guild conviction</span>
          <span className="label-eyebrow">Critic scores</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between text-2xl font-medium tabular-nums">
          <span>{guildWeight}%</span>
          <span className="text-ink-faint">{100 - guildWeight}%</span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={guildWeight}
          onChange={(e) => onGuildWeight(Number(e.target.value))}
          aria-label="Weight on guild conviction versus critic scores"
          className="mt-5 w-full accent-[var(--color-signal)]"
        />

        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          Critic scores come from TMDB. IMDb and Rotten Tomatoes can be layered in
          later, licence permitting.
        </p>
      </div>

      <div className="mt-10">
        <h3 className="label-eyebrow">
          Preview — last season&apos;s nominations, reweighted
        </h3>

        <ol className="mt-4 border-t border-rule">
          {pool.slice(0, 9).map((entry, index) => {
            const onSlate = slateIds.has(entry.film.id);
            return (
              <li
                key={entry.film.id}
                className={`flex items-baseline gap-4 border-b border-rule py-3 ${
                  onSlate ? "" : "opacity-40"
                }`}
              >
                <span className="w-5 shrink-0 tabular-nums text-xs text-ink-faint">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm tracking-tight">
                  {entry.film.title}
                </span>
                <span className="shrink-0 text-xs text-ink-faint tabular-nums">
                  {entry.points} pts · {entry.film.voteAverage.toFixed(1)}
                </span>
                {onSlate && (
                  <span className="size-1.5 shrink-0 rounded-full bg-signal" />
                )}
              </li>
            );
          })}
        </ol>

        <p className="mt-4 text-xs text-ink-faint">
          Marked films make the slate. Drag the slider and watch the order move.
        </p>
      </div>
    </section>
  );
}

