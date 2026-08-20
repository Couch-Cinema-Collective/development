import type { Film } from "../types";

/**
 * Fixture catalog for the Festival 3 "Hand-Drawn Animation" demo.
 *
 * Shaped exactly like the normalized TMDB response (see lib/tmdb.ts), so the
 * live client is a drop-in replacement. Every id below was verified against the
 * live API. `posterPath` is null throughout: with a key configured the catalog
 * is hydrated with real artwork at request time, and without one the poster
 * component renders a typographic card rather than shipping broken images.
 *
 * This is a browse list, not a limit — members can nominate anything TMDB knows.
 */
export const FIXTURE_FILMS: Film[] = [
  {
    id: 129,
    title: "Spirited Away",
    year: 2001,
    posterPath: null,
    director: "Hayao Miyazaki",
    runtime: 125,
    voteAverage: 8.5,
    overview:
      "A sullen ten-year-old wanders into a world ruled by gods and witches, where humans are turned into beasts.",
  },
  {
    id: 149,
    title: "Akira",
    year: 1988,
    posterPath: null,
    director: "Katsuhiro Otomo",
    runtime: 124,
    voteAverage: 8.0,
    overview:
      "A secret military project endangers Neo-Tokyo when it turns a biker gang member into a rampaging psychic psychopath.",
  },
  {
    id: 128,
    title: "Princess Mononoke",
    year: 1997,
    posterPath: null,
    director: "Hayao Miyazaki",
    runtime: 134,
    voteAverage: 8.3,
    overview:
      "On a journey to find a cure for a curse, a young warrior is caught between the forest gods and a mining colony.",
  },
  {
    id: 12477,
    title: "Grave of the Fireflies",
    year: 1988,
    posterPath: null,
    director: "Isao Takahata",
    runtime: 89,
    voteAverage: 8.5,
    overview:
      "A young boy and his little sister struggle to survive in Japan during the closing months of the Second World War.",
  },
  {
    id: 10494,
    title: "Perfect Blue",
    year: 1998,
    posterPath: null,
    director: "Satoshi Kon",
    runtime: 81,
    voteAverage: 8.2,
    overview:
      "A pop singer turned actress finds the line between reality and performance dissolving around her.",
  },
  {
    id: 4977,
    title: "Paprika",
    year: 2006,
    posterPath: null,
    director: "Satoshi Kon",
    runtime: 90,
    voteAverage: 7.7,
    overview:
      "A device that permits therapists to enter their patients' dreams is stolen, blurring dream and waking life.",
  },
  {
    id: 10386,
    title: "The Iron Giant",
    year: 1999,
    posterPath: null,
    director: "Brad Bird",
    runtime: 86,
    voteAverage: 7.9,
    overview:
      "A young boy befriends a giant robot that a paranoid government agent wants to destroy.",
  },
  {
    id: 2011,
    title: "Persepolis",
    year: 2007,
    posterPath: null,
    director: "Marjane Satrapi",
    runtime: 96,
    voteAverage: 7.8,
    overview:
      "A precocious girl comes of age against the backdrop of the Iranian Revolution.",
  },
  {
    id: 12429,
    title: "Ponyo",
    year: 2008,
    posterPath: null,
    director: "Hayao Miyazaki",
    runtime: 101,
    voteAverage: 7.6,
    overview:
      "A goldfish princess escapes the ocean and befriends a five-year-old boy on land.",
  },
  {
    id: 126319,
    title: "Ernest & Celestine",
    year: 2012,
    posterPath: null,
    director: "Benjamin Renner",
    runtime: 79,
    voteAverage: 7.6,
    overview:
      "An unlikely friendship between a bear and a mouse defies the rules of both their worlds.",
  },
  {
    id: 8885,
    title: "Waltz with Bashir",
    year: 2008,
    posterPath: null,
    director: "Ari Folman",
    runtime: 90,
    voteAverage: 7.6,
    overview:
      "A filmmaker reconstructs his lost memories of the 1982 Lebanon War through interviews with fellow veterans.",
  },
  {
    id: 8392,
    title: "My Neighbor Totoro",
    year: 1988,
    posterPath: null,
    director: "Hayao Miyazaki",
    runtime: 86,
    voteAverage: 8.1,
    overview:
      "Two sisters move to the countryside and discover the forest spirits living alongside them.",
  },
  {
    id: 15080,
    title: "Only Yesterday",
    year: 1991,
    posterPath: null,
    director: "Isao Takahata",
    runtime: 118,
    voteAverage: 7.4,
    overview:
      "A woman travels to the countryside and finds her childhood self travelling with her.",
  },
  {
    id: 9662,
    title: "The Triplets of Belleville",
    year: 2003,
    posterPath: null,
    director: "Sylvain Chomet",
    runtime: 80,
    voteAverage: 7.4,
    overview:
      "A grandmother and her dog cross the ocean to rescue a kidnapped Tour de France cyclist. Almost wordless.",
  },
  {
    id: 11837,
    title: "Watership Down",
    year: 1978,
    posterPath: null,
    director: "Martin Rosen",
    runtime: 91,
    voteAverage: 7.2,
    overview:
      "A group of rabbits flee their doomed warren in search of a new home, at considerable cost.",
  },
  {
    id: 16306,
    title: "Fantastic Planet",
    year: 1973,
    posterPath: null,
    director: "René Laloux",
    runtime: 72,
    voteAverage: 7.6,
    overview:
      "On a distant world, humans are kept as pets by a race of enormous blue humanoids.",
  },
  {
    id: 149871,
    title: "The Tale of the Princess Kaguya",
    year: 2013,
    posterPath: null,
    director: "Isao Takahata",
    runtime: 137,
    voteAverage: 8.1,
    overview:
      "A tiny girl found inside a bamboo stalk grows into a princess who does not want what she is given.",
  },
];

export const FILMS_BY_ID = new Map(FIXTURE_FILMS.map((f) => [f.id, f]));

export function searchFixtures(query: string): Film[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return FIXTURE_FILMS.filter(
    (f) =>
      f.title.toLowerCase().includes(q) || f.director.toLowerCase().includes(q),
  );
}
