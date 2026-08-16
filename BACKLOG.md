# Backlog

Parked deliberately — raised in review and deferred, not forgotten.

## From the 2026-08-15 design review

- **Category quiz** — the second of the three category-picking paths (PLAN.md
  §4A). "Guild collections" remains the third.
- **Custom vote-weight modifiers** — presidents opt into extras: bonus voting
  weight for seasons completed / streaks (longevity), extra weight when a
  member stakes all points on one film. Retention mechanics; needs its own
  design pass before any of it touches the ballot math.
- **Per-guild Discord config** — *half done as of `5f9a4db`.* Storage and the
  president-facing UI have landed: `guilds.discord_server_id` /
  `discord_invite_url` / `discord_webhook_url`, editable from the wizard's
  Communication step. **Still outstanding:** `lib/discord.ts` posts to the
  site-wide `DISCORD_WEBHOOK_URL` env var, so the announce route needs to read
  the season's guild instead.
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
