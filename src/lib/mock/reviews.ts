import type { Review, WatchRecord } from "../types";
import { CURRENT_MEMBER_ID } from "./guild";

/** What the current member has already watched this festival. */
export const WATCH_RECORDS: WatchRecord[] = [
  { filmId: 129, memberId: CURRENT_MEMBER_ID },
  { filmId: 149, memberId: CURRENT_MEMBER_ID },
  { filmId: 12477, memberId: CURRENT_MEMBER_ID },
  { filmId: 129, memberId: "m-miller" },
  { filmId: 149, memberId: "m-miller" },
  { filmId: 129, memberId: "m-dev" },
  { filmId: 10494, memberId: "m-dev" },
  { filmId: 149, memberId: "m-nina" },
];

export const REVIEWS: Review[] = [
  {
    id: "r-1",
    filmId: 149,
    memberId: "m-dev",
    body: "I put this up and I'd do it again. The motorcycle slide is thirty seconds that reorganised what the medium was allowed to attempt. Everything after it is downstream.",
    createdAt: "2026-07-28T19:04:00Z",
    eligible: true,
  },
  {
    id: "r-2",
    filmId: 149,
    memberId: "m-nina",
    body: "Astonishing to look at, genuinely incoherent as a story. I understand why it matters. I don't think I enjoyed it.",
    createdAt: "2026-07-29T22:41:00Z",
    eligible: true,
  },
  {
    id: "r-3",
    filmId: 12477,
    memberId: "m-sarah",
    body: "Watched it once. Will not be watching it again. That is the highest compliment I can pay a film.",
    createdAt: "2026-08-02T09:15:00Z",
    eligible: true,
  },
  {
    id: "r-4",
    filmId: 129,
    memberId: "m-miller",
    body: "The bathhouse sequence does more world-building in eight minutes than most trilogies manage. Loses half a point for the last twenty minutes, which drift.",
    createdAt: "2026-08-04T20:22:00Z",
    eligible: true,
  },
  {
    id: "r-5",
    filmId: 129,
    memberId: CURRENT_MEMBER_ID,
    body: "Third time seeing it and the first time I noticed how little anyone explains. No exposition, no rules stated, and you never once lose the thread. Extraordinary confidence.",
    createdAt: "2026-08-06T21:10:00Z",
    eligible: true,
  },
];
