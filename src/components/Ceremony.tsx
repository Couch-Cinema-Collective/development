"use client";

import { useCallback, useRef, useState } from "react";

import { FilmPoster } from "./FilmPoster";
import { isNative, shareImage } from "@/lib/native";
import {
  BEST_OF_THE_FEST,
  VOICE_OF_THE_PEOPLE,
  type AwardResult,
  type Film,
  type Member,
} from "@/lib/types";

interface CeremonyProps {
  results: AwardResult[];
  filmsById: Record<number, Film>;
  membersById: Record<string, Member>;
  /** Curators, ranked — the one who took Best of the Fest leads. */
  tally: { memberId: string; count: number; wonBestOfTheFest: boolean }[];
  /** The most-upvoted reviewer of the festival. Curators are eligible too. */
  voiceOfThePeople: { memberId: string; upvotes: number } | null;
  festivalNumber: number;
  theme: string;
  guildName: string;
}

export function Ceremony(props: CeremonyProps) {
  const {
    results,
    filmsById,
    membersById,
    tally,
    voiceOfThePeople,
    festivalNumber,
    theme,
    guildName,
  } = props;

  const [sharing, setSharing] = useState(false);

  const nameOf = useCallback(
    (id: string | null) => (id ? (membersById[id]?.name ?? "Unknown") : "—"),
    [membersById],
  );

  return (
    <>
      <Toolbar onShare={() => setSharing(true)} />

      <div className="ceremony-reel">
        <section className="ceremony-card flex flex-col items-center justify-center text-center">
          <p className="label-eyebrow text-paper/50">{guildName}</p>
          <h1 className="mt-6 break-words text-balance text-5xl font-medium uppercase leading-[0.9] tracking-tight text-paper sm:text-8xl">
            {theme}
          </h1>
          <p className="mt-8 text-sm uppercase tracking-[0.2em] text-paper/60">
            Festival {festivalNumber} · The Awards
          </p>
          <p className="mt-16 text-xs text-paper/40">Scroll to begin</p>
        </section>

        {results.map((result) => {
          const film = filmsById[result.filmId];
          if (!film) return null;

          return (
            <section key={result.awardId} className="ceremony-card">
              <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 text-center sm:flex-row sm:text-left">
                <div className="w-40 shrink-0 sm:w-52">
                  <FilmPoster film={film} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-signal">
                    {result.awardName}
                    {result.scoring && (
                      <span className="ml-3 text-paper/40">
                        Decides the festival
                      </span>
                    )}
                  </p>
                  <p className="mt-5 text-xs uppercase tracking-[0.18em] text-paper/45">
                    The award goes to
                  </p>
                  <h2 className="mt-3 break-words text-balance text-4xl font-medium uppercase leading-[0.95] tracking-tight text-paper sm:text-6xl">
                    {film.title}
                  </h2>
                  <p className="mt-5 text-sm text-paper/60">
                    {film.director} · {film.year}
                  </p>

                  <div className="mt-8 border-t border-paper/15 pt-5">
                    <p className="label-eyebrow text-paper/40">
                      Put up by
                    </p>
                    <p className="mt-2 text-lg text-paper">
                      {nameOf(result.curatorId)}
                    </p>
                    <p className="mt-3 text-xs text-paper/40 tabular-nums">
                      {result.votes} of {result.totalVotes} votes
                    </p>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {/* The critics' own award closes the night — counted from upvotes
            earned across the festival, never voted on a ballot. */}
        {voiceOfThePeople && (
          <section className="ceremony-card flex flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-signal">
              {VOICE_OF_THE_PEOPLE}
            </p>
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-paper/45">
              The sharpest writer of the festival
            </p>
            <h2 className="mt-4 break-words text-balance text-4xl font-medium uppercase leading-[0.95] tracking-tight text-paper sm:text-7xl">
              {membersById[voiceOfThePeople.memberId]?.name ?? "Unknown"}
            </h2>
            <p className="mt-6 text-sm text-paper/60 tabular-nums">
              {voiceOfThePeople.upvotes} upvote
              {voiceOfThePeople.upvotes === 1 ? "" : "s"} earned
            </p>
          </section>
        )}

        <section className="ceremony-card">
          <div className="mx-auto w-full max-w-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-signal">
              Tonight&apos;s curators
            </p>
            <p className="mt-4 text-sm text-paper/55">
              Every curator is credited with the awards their film took. Only{" "}
              {BEST_OF_THE_FEST} decides the festival — the rest are honours.
            </p>

            <ol className="mt-10 border-t border-paper/15">
              {tally.map((row) => (
                <li
                  key={row.memberId}
                  className="flex items-center gap-5 border-b border-paper/15 py-4"
                >
                  <span className="min-w-0 flex-1 truncate text-2xl uppercase tracking-tight text-paper">
                    {membersById[row.memberId]?.name ?? "Unknown"}
                    {row.wonBestOfTheFest && (
                      <span className="ml-3 text-xs uppercase tracking-[0.18em] text-signal">
                        Festival winner
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {Array.from({ length: row.count }).map((_, i) => (
                      <span key={i} className="size-2.5 rounded-full bg-signal" />
                    ))}
                  </span>
                  <span className="w-8 shrink-0 text-right tabular-nums text-paper/50">
                    {row.count}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {sharing && (
        <SharePanel
          results={results}
          filmsById={filmsById}
          nameOf={nameOf}
          festivalNumber={festivalNumber}
          theme={theme}
          onClose={() => setSharing(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function Toolbar({ onShare }: { onShare: () => void }) {
  return (
    <div className="ceremony-toolbar fixed right-6 top-24 z-20 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="border border-paper/30 bg-ink/80 px-4 py-2.5 text-xs uppercase tracking-[0.12em] text-paper backdrop-blur transition-colors hover:bg-signal hover:border-signal"
      >
        Save as PDF
      </button>
      <button
        type="button"
        onClick={onShare}
        className="border border-paper/30 bg-ink/80 px-4 py-2.5 text-xs uppercase tracking-[0.12em] text-paper backdrop-blur transition-colors hover:bg-signal hover:border-signal"
      >
        Share graphics
      </button>
    </div>
  );
}

/* --- Share graphics -------------------------------------------------
 * Cards are drawn straight onto a canvas rather than screenshotting the DOM.
 * The design is typographic, so this needs no external images and therefore
 * never taints the canvas — toDataURL always succeeds.
 */

const CARD = 1080;

/**
 * The horizontal lockup, drawn onto the share card. Resolves to null if the
 * asset can't load so a missing file degrades to the typed wordmark rather
 * than leaving the corner empty.
 */
function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/brand/Cinema_logo_black_hor.png";
  });
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function SharePanel({
  results,
  filmsById,
  nameOf,
  festivalNumber,
  theme,
  onClose,
}: {
  results: AwardResult[];
  filmsById: Record<number, Film>;
  nameOf: (id: string | null) => string;
  festivalNumber: number;
  theme: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0);

  const result = results[index];
  const film = filmsById[result.filmId];

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !film) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    await document.fonts.ready;
    // Same-origin asset, so the canvas is never tainted and toDataURL works.
    const logo = await loadLogo();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CARD, CARD);

    const pad = 88;

    ctx.fillStyle = "rgba(11,11,11,0.5)";
    ctx.font = "500 26px Jost, sans-serif";
    ctx.letterSpacing = "5px";
    ctx.fillText(
      `FESTIVAL ${festivalNumber} · ${theme.toUpperCase()}`,
      pad,
      pad + 26,
    );

    ctx.fillStyle = "#e62b24";
    ctx.fillRect(pad, pad + 66, 88, 5);

    ctx.font = "500 40px Jost, sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText(result.awardName.toUpperCase(), pad, pad + 190);

    ctx.fillStyle = "#0b0b0b";
    ctx.letterSpacing = "-1px";
    ctx.font = "500 104px Jost, sans-serif";
    const lines = wrap(ctx, film.title.toUpperCase(), CARD - pad * 2);
    lines.forEach((line, i) => ctx.fillText(line, pad, 500 + i * 108));

    ctx.fillStyle = "rgba(11,11,11,0.55)";
    ctx.letterSpacing = "0px";
    ctx.font = "400 34px Jost, sans-serif";
    ctx.fillText(`${film.director} · ${film.year}`, pad, 500 + lines.length * 108 + 40);

    ctx.fillStyle = "rgba(11,11,11,0.4)";
    ctx.font = "500 24px Jost, sans-serif";
    ctx.letterSpacing = "4px";
    ctx.fillText("PUT UP BY", pad, CARD - pad - 96);

    ctx.fillStyle = "#0b0b0b";
    ctx.font = "400 40px Jost, sans-serif";
    ctx.letterSpacing = "0px";
    ctx.fillText(nameOf(result.curatorId), pad, CARD - pad - 44);

    // Real lockup rather than a typed-out wordmark, bottom-right, height-locked.
    if (logo) {
      const height = 68;
      const width = (logo.width / logo.height) * height;
      ctx.drawImage(logo, CARD - pad - width, CARD - pad - height, width, height);
    } else {
      ctx.fillStyle = "rgba(11,11,11,0.35)";
      ctx.font = "500 22px Jost, sans-serif";
      ctx.letterSpacing = "4px";
      ctx.textAlign = "right";
      ctx.fillText("COUCH CINEMA COLLECTIVE", CARD - pad, CARD - pad - 44);
      ctx.textAlign = "left";
    }
  }, [film, nameOf, result, theme, festivalNumber]);

  const download = async () => {
    await draw();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const filename = `${result.awardId}-${film?.title ?? "award"}.png`.replace(
      /\s+/g,
      "-",
    );
    // On device this opens the iOS share sheet; in a browser it downloads.
    await shareImage(
      canvas.toDataURL("image/png"),
      filename,
      `${result.awardName} — ${film?.title ?? ""}`,
    );
  };

  return (
    <div className="ceremony-toolbar fixed inset-0 z-30 flex items-center justify-center bg-ink/90 p-6 backdrop-blur">
      <div className="max-h-full w-full max-w-lg overflow-y-auto bg-paper p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="label-eyebrow">Share graphics</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-ink-faint hover:text-ink"
          >
            Close ×
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={CARD}
          height={CARD}
          className="mt-5 aspect-square w-full border border-rule bg-white"
        />

        <p className="mt-3 text-xs text-ink-faint">
          1080 × 1080, sized for Instagram and messaging. Press render, then
          {isNative() ? "share" : "download"}.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="min-w-0 flex-1 border border-rule bg-transparent px-3 py-2.5 text-sm outline-none focus:border-signal"
          >
            {results.map((r, i) => (
              <option key={r.awardId} value={i}>
                {r.awardName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={draw}
            className="border border-ink px-4 py-2.5 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper"
          >
            Render
          </button>
          <button
            type="button"
            onClick={download}
            className="bg-signal px-4 py-2.5 text-xs uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink"
          >
            {isNative() ? "Share" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
