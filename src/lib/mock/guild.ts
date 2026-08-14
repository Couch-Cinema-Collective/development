import type { Guild, Member, Nomination, Season } from "../types";
import { DEFAULT_WEIGHTS } from "../slate";
import { AWARD_CATALOG, DEFAULT_AWARD_IDS } from "./awards";

/** The member viewing the prototype. */
export const CURRENT_MEMBER_ID = "m-jack";

export const MEMBERS: Member[] = [
  {
    id: CURRENT_MEMBER_ID,
    name: "Jack Nagel",
    seasonsPlayed: 3,
    awards: [
      { awardId: "picture", awardName: "Best Picture", filmTitle: "Stalker", seasonNumber: 2 },
      { awardId: "director", awardName: "Best Director", filmTitle: "Stalker", seasonNumber: 2 },
      { awardId: "cinematography", awardName: "Best Cinematography", filmTitle: "In the Mood for Love", seasonNumber: 1 },
    ],
  },
  {
    id: "m-miller",
    name: "Miller",
    seasonsPlayed: 3,
    awards: [
      { awardId: "screenplay", awardName: "Best Original Screenplay", filmTitle: "Chinatown", seasonNumber: 1 },
    ],
  },
  { id: "m-sarah", name: "Sarah", seasonsPlayed: 2, awards: [] },
  {
    id: "m-dev",
    name: "Dev",
    seasonsPlayed: 3,
    awards: [
      { awardId: "editing", awardName: "Best Editing", filmTitle: "The Conversation", seasonNumber: 2 },
    ],
  },
  { id: "m-tess", name: "Tess", seasonsPlayed: 1, awards: [] },
  { id: "m-ray", name: "Ray", seasonsPlayed: 2, awards: [] },
  { id: "m-nina", name: "Nina", seasonsPlayed: 3, awards: [] },
];

export const MEMBERS_BY_ID = new Map(MEMBERS.map((m) => [m.id, m]));

export const GUILD: Guild = {
  id: "g-couch",
  name: "The Sunday Couch",
  members: MEMBERS,
  maxMembers: 50,
};

export const AWARD_CATEGORIES = AWARD_CATALOG.filter((a) =>
  DEFAULT_AWARD_IDS.includes(a.id),
);

/** One custom award, to show where they land in the ceremony order. */
export const CUSTOM_AWARDS = [
  { id: "custom-voiceover", name: "Most Unnecessary Voiceover", tier: "custom" as const },
];

/** Deadline is generated relative to load so the countdown is always live. */
export const SEASON: Season = {
  id: "s-3",
  number: 3,
  guildId: GUILD.id,
  category: "Hand-Drawn Animation",
  state: "NOMINATING",
  filmCount: 6,
  nominationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 62).toISOString(),
  awards: [...AWARD_CATEGORIES, ...CUSTOM_AWARDS],
  weights: DEFAULT_WEIGHTS,
};

/**
 * Nominations already cast by everyone except the current member, whose stake
 * the draft screen collects live. Note the spread of strategies: Dev has gone
 * all-in on one film, Nina has hedged across five.
 */
export const EXISTING_NOMINATIONS: Nomination[] = [
  { filmId: 149, memberId: "m-dev", points: 5 },

  { filmId: 129, memberId: "m-miller", points: 3 },
  { filmId: 4977, memberId: "m-miller", points: 2 },

  { filmId: 12477, memberId: "m-sarah", points: 4 },
  { filmId: 2011, memberId: "m-sarah", points: 1 },

  { filmId: 10494, memberId: "m-tess", points: 3 },
  { filmId: 8885, memberId: "m-tess", points: 2 },

  { filmId: 128, memberId: "m-ray", points: 2 },
  { filmId: 8392, memberId: "m-ray", points: 2 },
  { filmId: 12429, memberId: "m-ray", points: 1 },

  { filmId: 129, memberId: "m-nina", points: 1 },
  { filmId: 10386, memberId: "m-nina", points: 1 },
  { filmId: 16306, memberId: "m-nina", points: 1 },
  { filmId: 9662, memberId: "m-nina", points: 1 },
  { filmId: 149871, memberId: "m-nina", points: 1 },
];

/** What the current member ended up staking, once the draft closed. */
export const OWN_NOMINATIONS: Nomination[] = [
  { filmId: 129, memberId: CURRENT_MEMBER_ID, points: 2 },
  { filmId: 12477, memberId: CURRENT_MEMBER_ID, points: 2 },
  { filmId: 128, memberId: CURRENT_MEMBER_ID, points: 1 },
];

/** Every stake in the season, used by the ballot and ceremony screens. */
export const RESOLVED_NOMINATIONS: Nomination[] = [
  ...EXISTING_NOMINATIONS,
  ...OWN_NOMINATIONS,
];

/**
 * The locked slate for the in-season, ballot, and ceremony screens — what the
 * draft above resolves to once nominations close.
 */
export const SLATE_FILM_IDS = [129, 149, 12477, 10494, 128, 4977];

/** Members who staked points on a film — each earns a credit if it wins (§1.3). */
export function nominatorsOf(filmId: number): string[] {
  return [
    ...new Set(
      RESOLVED_NOMINATIONS.filter((n) => n.filmId === filmId).map(
        (n) => n.memberId,
      ),
    ),
  ];
}
