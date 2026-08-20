import {
  DEFAULT_CADENCE,
  type Festival,
  type Guild,
  type Member,
  type Nomination,
} from "../types";
import {
  AWARD_CATALOG,
  BEST_OF_THE_FEST_AWARD,
  DEFAULT_AWARD_IDS,
} from "./awards";

/** The member viewing the prototype. */
export const CURRENT_MEMBER_ID = "m-jack";

/**
 * A guild mid-festival: six curators (the president included) and a couple of
 * critics who vote without programming. Award credits belong to whoever
 * nominated the winning film, and only Best of the Fest scores.
 */
export const MEMBERS: Member[] = [
  {
    id: CURRENT_MEMBER_ID,
    name: "Jack Nagel",
    role: "president",
    festivalsPlayed: 3,
    awards: [
      {
        awardId: "best-of-the-fest",
        awardName: "Best of the Fest",
        filmTitle: "Stalker",
        festivalNumber: 2,
        scoring: true,
      },
      {
        awardId: "director",
        awardName: "Best Director",
        filmTitle: "Stalker",
        festivalNumber: 2,
        scoring: false,
      },
      {
        awardId: "cinematography",
        awardName: "Best Cinematography",
        filmTitle: "In the Mood for Love",
        festivalNumber: 1,
        scoring: false,
      },
    ],
  },
  {
    id: "m-miller",
    name: "Miller",
    role: "curator",
    festivalsPlayed: 3,
    awards: [
      {
        awardId: "screenplay",
        awardName: "Best Screenplay",
        filmTitle: "Chinatown",
        festivalNumber: 1,
        scoring: false,
      },
    ],
  },
  { id: "m-sarah", name: "Sarah", role: "curator", festivalsPlayed: 2, awards: [] },
  {
    id: "m-dev",
    name: "Dev",
    role: "curator",
    festivalsPlayed: 3,
    awards: [
      {
        awardId: "editing",
        awardName: "Best Editing",
        filmTitle: "The Conversation",
        festivalNumber: 2,
        scoring: false,
      },
    ],
  },
  { id: "m-tess", name: "Tess", role: "curator", festivalsPlayed: 1, awards: [] },
  { id: "m-ray", name: "Ray", role: "curator", festivalsPlayed: 2, awards: [] },
  // Critics vote but never programme, so they hold no film awards.
  { id: "m-nina", name: "Nina", role: "critic", festivalsPlayed: 3, awards: [] },
  { id: "m-omar", name: "Omar", role: "critic", festivalsPlayed: 1, awards: [] },
];

export const MEMBERS_BY_ID = new Map(MEMBERS.map((m) => [m.id, m]));

export const GUILD: Guild = {
  id: "g-couch",
  name: "The Sunday Couch",
  members: MEMBERS,
  maxCurators: 12,
  maxCritics: 50,
};

/** The honorary categories this guild switched on. */
export const AWARD_CATEGORIES = AWARD_CATALOG.filter((a) =>
  DEFAULT_AWARD_IDS.includes(a.id),
);

/** One made-up award, to show where they land in the ceremony order. */
export const CUSTOM_AWARDS = [
  {
    id: "custom-voiceover",
    name: "Most Unnecessary Voiceover",
    tier: "custom" as const,
  },
];

/** Deadline is generated relative to load so the countdown is always live. */
export const FESTIVAL: Festival = {
  id: "f-3",
  number: 3,
  guildId: GUILD.id,
  theme: "Hand-Drawn Animation",
  themeFamily: "genres",
  state: "NOMINATING",
  visibility: "closed",
  // One film per curator — six of the eight members programme.
  filmCount: 6,
  nominationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 62).toISOString(),
  screeningStartsAt: null,
  cadence: DEFAULT_CADENCE,
  awards: [BEST_OF_THE_FEST_AWARD, ...AWARD_CATEGORIES, ...CUSTOM_AWARDS],
};

/**
 * Nominations already filed by the other curators. One film each — the point
 * spreading of the old draft is gone, so a curator either has a pick or
 * doesn't.
 */
export const EXISTING_NOMINATIONS: Nomination[] = [
  { filmId: 149, memberId: "m-dev" },
  { filmId: 129, memberId: "m-miller" },
  { filmId: 12477, memberId: "m-sarah" },
  { filmId: 10494, memberId: "m-tess" },
  { filmId: 128, memberId: "m-ray" },
];

/** What the current member put up. */
export const OWN_NOMINATIONS: Nomination[] = [
  { filmId: 4977, memberId: CURRENT_MEMBER_ID },
];

/** Every pick in the festival, used by the ballot and ceremony screens. */
export const RESOLVED_NOMINATIONS: Nomination[] = [
  ...EXISTING_NOMINATIONS,
  ...OWN_NOMINATIONS,
];

/** The lineup is exactly the curators' picks, in screening order. */
export const LINEUP_FILM_IDS = RESOLVED_NOMINATIONS.map((n) => n.filmId);

/** The curator who put a film up — the one who earns the credit if it wins. */
export function curatorOf(filmId: number): string | null {
  return (
    RESOLVED_NOMINATIONS.find((n) => n.filmId === filmId)?.memberId ?? null
  );
}
