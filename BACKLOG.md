# Backlog

Parked deliberately — raised in review and deferred, not forgotten.

## From the 2026-08-15 design review

- **Category quiz** — the second of the three category-picking paths (PLAN.md
  §4A). "Guild collections" remains the third.
- **Custom vote-weight modifiers** — presidents opt into extras: bonus voting
  weight for seasons completed / streaks (longevity), extra weight when a
  member stakes all points on one film. Retention mechanics; needs its own
  design pass before any of it touches the ballot math.
- **Per-guild Discord config** — server ID, invite, and webhook are currently
  site-wide env vars. Real multi-guild support means storing them per guild
  (columns on `guilds`, president-editable) and the announce route reading
  the season's guild. The wizard's Communication step already teaches setup.
- **Managed text/email sending** — the app sending texts itself means an LLC
  and a texting vendor (Twilio et al). For now: prewritten templates via
  sms:/mailto: links. Same story for email digests.
- **Stored season duration** — custom format's duration is a cosmetic label;
  seasons have no end date column. Add one when the halfway-reminder or any
  automated cadence needs to know real dates.

## Earlier deferrals (PLAN.md §6 still stands)

- Public leagues beyond the 50 cap, Trakt verification, Letterboxd import,
  the full ~80-category library, final award list, ARCHIVED-state category
  vote for next season.
