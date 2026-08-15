import "server-only";

import type { Film } from "./types";
import { FILMS_BY_ID, FIXTURE_FILMS, searchFixtures } from "./mock/films";

const BASE = "https://api.themoviedb.org/3";

/** v4 read token preferred; v3 key supported for convenience. */
const READ_TOKEN = process.env.TMDB_READ_TOKEN;
const API_KEY = process.env.TMDB_API_KEY;

/**
 * Whether live TMDB is configured. When false, every function below falls back
 * to fixtures on the same code path — dropping a key into .env.local is the
 * only change needed to go live (PLAN.md §3.1).
 */
export function isLive(): boolean {
  return Boolean(READ_TOKEN || API_KEY);
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (!READ_TOKEN && API_KEY) url.searchParams.set("api_key", API_KEY);

  const res = await fetch(url, {
    headers: READ_TOKEN ? { Authorization: `Bearer ${READ_TOKEN}` } : {},
    // Details and credits are effectively immutable; cache hard to stay far
    // below the ~40 req/s per-IP limit.
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) {
    throw new Error(`TMDB ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

interface TmdbSearchResponse {
  results: { id: number }[];
}

interface TmdbMovie {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  runtime?: number;
  vote_average: number;
  overview: string;
  imdb_id?: string | null;
  credits?: { crew?: { job: string; name: string }[] };
}

function normalize(movie: TmdbMovie): Film {
  const director =
    movie.credits?.crew?.find((c) => c.job === "Director")?.name ?? "Unknown";

  return {
    id: movie.id,
    title: movie.title,
    year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : 0,
    posterPath: movie.poster_path,
    director,
    runtime: movie.runtime ?? 0,
    voteAverage: movie.vote_average,
    overview: movie.overview,
    imdbId: movie.imdb_id ?? null,
  };
}

/**
 * Search returns ids only; details are fetched per result because the nomination
 * card shows director and runtime. Capped at 8 to bound the fan-out.
 */
export async function searchFilms(query: string): Promise<Film[]> {
  if (!query.trim()) return [];
  if (!isLive()) return searchFixtures(query);

  const { results } = await tmdb<TmdbSearchResponse>("/search/movie", {
    query,
    include_adult: "false",
  });

  const films = await Promise.all(
    results.slice(0, 8).map((r) => getFilm(r.id).catch(() => null)),
  );
  return films.filter((f): f is Film => f !== null);
}

/**
 * Best single match for a title, used to illustrate wiki exemplars. Returns null
 * rather than throwing so one bad lookup never blanks a whole page.
 */
export async function findFilmByTitle(title: string): Promise<Film | null> {
  if (!isLive()) return searchFixtures(title)[0] ?? null;

  try {
    const { results } = await tmdb<TmdbSearchResponse>("/search/movie", {
      query: title,
      include_adult: "false",
    });
    if (!results.length) return null;
    return await getFilm(results[0].id);
  } catch {
    return null;
  }
}

export async function getFilm(id: number): Promise<Film | null> {
  if (!isLive()) return FILMS_BY_ID.get(id) ?? null;

  // One call gets metadata, crew, and streaming availability.
  const movie = await tmdb<TmdbMovie>(`/movie/${id}`, {
    append_to_response: "credits,watch/providers",
  });
  return normalize(movie);
}

interface TmdbGenreList {
  genres: { id: number; name: string }[];
}

interface TmdbKeywordResponse {
  results: { id: number; name: string }[];
}

/**
 * A starting shelf for the draft's browse grid, matched to the season's
 * category. Three passes, most precise first:
 *   1. official TMDB genre ("Animation", "Spaghetti Westerns" → Western)
 *   2. keyword discovery ("french new wave", "heist" — movements and themes)
 *   3. plain title search, as a last resort
 * Results rank by vote count, so the shelf reads as the category's canon.
 */
export async function catalogForCategory(category: string): Promise<Film[]> {
  if (!isLive() || !category.trim()) return FIXTURE_FILMS;

  try {
    let ids: number[] = [];

    const { genres } = await tmdb<TmdbGenreList>("/genre/movie/list");
    const cat = category.toLowerCase();
    const genre = genres.find((g) => {
      const name = g.name.toLowerCase();
      return cat.includes(name) || name.includes(cat);
    });
    if (genre) {
      const { results } = await tmdb<TmdbSearchResponse>("/discover/movie", {
        with_genres: String(genre.id),
        sort_by: "vote_count.desc",
        "vote_count.gte": "300",
        include_adult: "false",
      });
      ids = results.slice(0, 12).map((r) => r.id);
    }

    if (!ids.length) {
      const { results: keywords } = await tmdb<TmdbKeywordResponse>(
        "/search/keyword",
        { query: category },
      );
      const keywordIds = keywords.slice(0, 2).map((k) => k.id);
      if (keywordIds.length) {
        const { results } = await tmdb<TmdbSearchResponse>("/discover/movie", {
          with_keywords: keywordIds.join("|"),
          sort_by: "vote_count.desc",
          include_adult: "false",
        });
        ids = results.slice(0, 12).map((r) => r.id);
      }
    }

    if (!ids.length) {
      const { results } = await tmdb<TmdbSearchResponse>("/search/movie", {
        query: category,
        include_adult: "false",
      });
      ids = results.slice(0, 12).map((r) => r.id);
    }

    const films = await Promise.all(
      ids.map((id) => getFilm(id).catch(() => null)),
    );
    return films.filter((f): f is Film => f !== null);
  } catch {
    // An empty grid with working search beats the wrong category's canon.
    return [];
  }
}

export function posterUrl(path: string | null, size: "w342" | "w500" = "w342"): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

/**
 * Replace fixture entries with live TMDB records where possible, so the browse
 * catalog gets real artwork once a key is configured. Any id that fails to
 * resolve keeps its fixture, so a wrong id degrades to a typographic card
 * rather than an empty grid.
 */
export async function hydrateCatalog(catalog: Film[]): Promise<Film[]> {
  if (!isLive()) return catalog;

  return Promise.all(
    catalog.map(async (fixture) => {
      try {
        return (await getFilm(fixture.id)) ?? fixture;
      } catch {
        return fixture;
      }
    }),
  );
}
