import { Countdown } from "./Countdown";
import { FilmPoster } from "./FilmPoster";
import type { Film } from "@/lib/types";

/**
 * A curator's submitted film, on the guild home.
 *
 * Once a pick is locked there is nothing left for that curator to do until the
 * lineup is drawn, and a screen that offers no next step reads as broken. So
 * this states the position plainly — your film is in, here is what everyone
 * else is still doing, here is the clock — rather than leaving them wondering
 * whether they missed a button.
 */
export function LockedSubmission({
  film,
  deadline,
  submitted,
  expected,
}: {
  film: Film;
  /** Nomination deadline, if the festival has one set. */
  deadline: string | null;
  submitted: number;
  expected: number;
}) {
  const outstanding = Math.max(0, expected - submitted);

  return (
    <section className="border border-ink bg-paper-raised p-6">
      <p className="label-eyebrow text-signal">Locked in</p>

      <div className="mt-5 flex flex-wrap items-start gap-6">
        <div className="w-24 shrink-0 sm:w-28">
          <FilmPoster film={film} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-soft">Your submission is</p>
          <h2 className="mt-1 text-balance text-3xl font-medium uppercase leading-none tracking-tight">
            {film.title}
          </h2>
          <p className="mt-2 text-sm text-ink-faint">
            {film.year}
            {film.director ? ` · ${film.director}` : ""}
            {film.runtime ? ` · ${film.runtime} min` : ""}
          </p>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">
            {outstanding > 0 ? (
              <>
                {outstanding} other curator{outstanding === 1 ? " is" : "s are"}{" "}
                still picking their film{outstanding === 1 ? "" : "s"}. The
                festival starts once everyone is in and your president draws the
                lineup.
              </>
            ) : (
              <>
                Every curator is in. Your president draws the lineup next, and
                the festival starts from there.
              </>
            )}
          </p>

          <p className="mt-4 text-xs tabular-nums text-ink-faint">
            {submitted} of {expected} curators locked in
          </p>
        </div>
      </div>

      {deadline && (
        <div className="mt-6 border-t border-rule pt-5">
          <p className="label-eyebrow">Nominations close in</p>
          <div className="mt-2">
            <Countdown
              deadline={deadline}
              expiredLabel="Nominations closed"
              size="small"
            />
          </div>
        </div>
      )}
    </section>
  );
}
