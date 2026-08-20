# Couch Cinema Collective — prototype

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase auth.
Product decisions live in [`../PLAN.md`](../PLAN.md).

## Running it locally

```bash
cd web
npm install
cp .env.example .env.local   # then fill in — see below
npm run dev                  # http://localhost:3000
```

**Only TMDB is required.** Everything else degrades gracefully: without Supabase
auth is hidden and every page is public, without Discord that panel just sits
empty, without APNs no notifications send. The app boots and is fully browsable
with a TMDB key alone.

| Variable | Needed for | Where to get it |
|---|---|---|
| `TMDB_READ_TOKEN` | Everything — the film catalog | themoviedb.org → Settings → API |
| `NEXT_PUBLIC_SUPABASE_*` | Sign-in, protected routes | Supabase → Project Settings → API Keys |
| `NEXT_PUBLIC_DISCORD_*` | Server presence panel | Discord → Server Settings → Engagement → Widget |
| `DISCORD_WEBHOOK_URL` | Posting announcements | Discord → Server Settings → Integrations → Webhooks |

## What's built

| Route | What |
|---|---|
| `/` | Season overview + state-machine strip |
| `/draft` | Nomination draft — five points, drag or click |
| `/season` | In-season room: watch tracking, reviews, Discord |
| `/vote` | Ballot, gated on finishing the slate |
| `/ceremony` | Awards reveal + PDF export + share graphics |
| `/wiki` | Film school — all 65 categories |
| `/commissioner/new` | Season setup wizard (auth-protected) |
| `/profile` | Lifetime award record (auth-protected) |

## Layout

| Path | What |
|---|---|
| `src/lib/types.ts` | Domain model |
| `src/lib/slate.ts` | Pool ranking + slate selection |
| `src/lib/tmdb.ts` | TMDB client, fixture fallback |
| `src/lib/scores.ts` | External scores behind a detachable provider |
| `src/lib/discord.ts` | Outbound webhook announcements |
| `src/lib/supabase/` | Auth clients + route proxy |
| `src/lib/mock/` | Fixture guild, season, catalog, categories |
| `src/app/globals.css` | **All brand tokens.** Correct the palette here. |

## Known state

- **Nothing persists.** Guilds, nominations, reviews, and ballots are fixture
  files and component state. Refreshing resets them. Supabase auth is wired but
  the data layer is not.
- The season is a fixed demo: The Sunday Couch, Season 3, Hand-Drawn Animation.
- `/login` and `/signup` exist; the rest of the auth flow is mid-build.
