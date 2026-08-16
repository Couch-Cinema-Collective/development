# Changelog

What went live, newest first. `main` deploys to couchcinemacollective.com on
every push, so each entry here is one deploy.

---

## 2026-08-16 — `5f9a4db`

Draft pool controls, film premises, review upvotes, performer votes.

### ⚠️ Action required before this fully works

**Run `supabase/schema-03-social.sql` in the Supabase SQL editor.** Three of
the features below write to tables and columns that don't exist yet, and will
error until it's applied. The file is idempotent — safe to re-run.

It adds:
- `guilds.discord_server_id` / `discord_invite_url` / `discord_webhook_url`
- `review_votes` table + RLS
- `votes.person_id` / `votes.person`

### Draft screen

- **The pool rail now shows your own stake per film**, with its own `−`/`+`.
  You can rebalance from the rail instead of scrolling the grid to find the
  card. It shares the debounced save path with the cards, so the two can't
  disagree.
- **Film premises.** Clicking a poster reveals the synopsis under the title and
  runtime; the pool list carries a two-line version. This is TMDB's `overview`,
  which we already load with every film — no extra request per card. (OMDb's
  `Plot` is near-identical and would have cost a second round-trip keyed on
  IMDb id.)

### Season room

- **Reviews can be upvoted.** Counts are derived from `review_votes` rows
  rather than stored on the review, so they can't drift. RLS blocks upvoting
  your own write-up. The guild's best-received reviews sort to the top.

### Ballot

- **Acting categories now pick a person, not just a film.** Choosing a film
  loads the top five billed cast from TMDB and shows them as a radio row with
  headshots and character names.
- **The vote is withheld until a performer is named.** Picking only a film
  leaves the category incomplete and its progress segment unfilled — a
  film-only acting vote in the database would be worse than none.
- Ensemble is deliberately excluded; that award belongs to the whole cast.
- New endpoint: `GET /api/films/cast?id=` — proxied so the TMDB key stays
  server-side, cached 24h since billing order for a finished film never changes.

### Commissioner onboarding

- **The Communication step now has the Discord fields** — server ID, invite
  link, webhook URL — with validation for the usual mistakes (server *name*
  pasted instead of the ID, wrong URL shape).
- Added a **link out to create a Discord server** for guilds that don't have
  one. Discord has no deep link to the create-server dialog, so it opens the
  app where the `+` button lives.
- **The setup walkthrough is no longer behind a disclosure.** All three
  guides are visible as columns — people weren't opening the drawer.

### Chrome

- **Favicon is the couch mark on a red tile.** The source logo is 488×301, so
  using it directly would have squashed it; this is padded to a 512×512 square.

### Notes for whoever picks this up next

- **The per-guild Discord backlog item is half done.** Storage and the
  president-facing UI landed (columns on `guilds`, editable in the wizard), but
  `lib/discord.ts` still posts to the site-wide `DISCORD_WEBHOOK_URL` env var.
  Wiring the announce route to read the season's guild is the remaining piece.
- The webhook is written but never read back to the browser — treat it as a
  credential.
- `next-env.d.ts` will show as modified depending on whether you last ran
  `dev` or `build`. It's generated; ignore it.
