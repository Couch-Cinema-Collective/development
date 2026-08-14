import Image from "next/image";
import type { Film } from "@/lib/types";

/**
 * A film's poster. TMDB art when available; otherwise a typographic card in the
 * brand's own voice rather than a broken image or grey placeholder.
 */
export function FilmPoster({ film, className = "" }: { film: Film; className?: string }) {
  const src = film.posterPath
    ? `https://image.tmdb.org/t/p/w342${film.posterPath}`
    : null;

  if (src) {
    return (
      <div className={`relative aspect-[2/3] overflow-hidden bg-ink ${className}`}>
        <Image
          src={src}
          alt={film.title}
          fill
          sizes="(max-width: 768px) 45vw, 220px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex aspect-[2/3] flex-col justify-between bg-ink p-4 text-paper ${className}`}
    >
      <span className="label-eyebrow text-paper/45">{film.year || "—"}</span>

      <span className="text-balance text-lg font-medium uppercase leading-[1.1] tracking-tight">
        {film.title}
      </span>

      <span className="space-y-2">
        <span className="block h-px w-8 bg-signal" />
        <span className="block truncate text-xs text-paper/55">{film.director}</span>
      </span>
    </div>
  );
}
