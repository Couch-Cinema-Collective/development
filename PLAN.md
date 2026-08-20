# Couch Cinema Collective — Plan

**Status:** festival model locked, built full-stack
**Target:** Next.js app on Supabase, live TMDB

---

## 0. Product thesis

**A film society with an awards night — not a fantasy league with a standings table.**

The rhythm is borrowed from fantasy football (a weekly obligation you look forward to); everything else is deliberately a film club. Recognition comes from *the festival your pick won*, which is a fact about the run rather than a score we made up.

**What changed from the season model.** The first build ran on five nomination points per member, a weighted slate algorithm, and one ballot at the end. That is gone. Curators now put up exactly one film each, the lineup is the roster, and the festival plays out film by film on a clock. The point-staking mechanic was fun to build and it made nominating a game, but it made the *festival* an abstraction — you voted once, months later, on a slate an algorithm cut. One film per curator is a harder commitment and a clearer stake.

---

## 1. Core mechanics

### 1.1 One curator, one film ✅

Every curator nominates a single film. No points, no shortlist, no hedging. The lineup is exactly the set of curator picks, which means:

- A guild of 8 curators runs an 8-film festival. Roster size *is* festival size.
- No cut, no algorithm, no tie-break — nobody's pick can lose on a technicality because nothing competes at nomination time.
- Who picked what stays hidden until the lineup is drawn (RLS, not UI), so nobody plays off anyone else's choice.

Screening order is **shuffled** at lineup time. Going in nomination order would reward whoever filed first.

### 1.2 The two chairs ✅

| | Curator | Critic |
|---|---|---|
| Cap per guild | 4–12 (president included) | 50 |
| Admission | President approves | Immediate |
| Puts up a film | Yes, exactly one | No |
| Watches, reviews, votes | Yes | Yes |
| Eligible for Best of the Fest | Yes | No |
| Eligible for Voice of the People | Yes | Yes |

**Every curator is also a critic.** Curating is an addition to the critic's job, never a replacement — a curator watches, reviews, and upvotes on every film including their own.

The president is the curator who founded the guild. They set the theme and the pace, approve curator seats, and drive the festival's transitions.

### 1.3 The per-film cycle ✅

This is the engine. Each film in the lineup runs the same three windows in turn:

```
VIEWING (14d) ──► REVIEWING (2d) ──► CRITICS_VOTING (24h) ──► CLOSED
```

Then the next film opens. Defaults above; the president picks a preset (a week / a fortnight / a month per film).

- **Viewing** — watch it. Mark it off.
- **Reviewing** — 200 characters, max. Late write-ups are welcome but flagged ineligible: you can still say your piece, you just can't be voted on.
- **Critics voting** — reviews are revealed anonymously and each critic spends **exactly 3 upvotes**. Spend fewer and your own review stops being eligible to receive any. Participation is the price of competing.
- **Closed** — authors revealed, best review highlighted.

**Nothing is stored as "current."** Phase is derived from timestamps, in Postgres (`screening_phase()`) and mirrored in TypeScript (`lib/lineup.ts`). No scheduled job has to tick anything over, and every client agrees without being told.

### 1.4 Anonymity ✅

Reviews are anonymous until their film's voting window shuts — people should upvote the writing, not the writer. This can't be an RLS policy (Postgres has no conditional column masking), so reviews are read exclusively through `film_reviews()`, a security-definer function that withholds `user_id` and vote counts until `CLOSED`. Direct selects on `reviews` return your own rows only.

### 1.5 Awards ✅

**Best of the Fest is the only award that scores.** Winning it wins the festival for the curator who put the film up. A unique partial index enforces exactly one scoring award per festival.

Everything else is honorary — up to 12 categories, the president's choice, drawn from an Oscars-shaped catalog or invented outright. The app suggests witty names based on the theme family. Honorary wins show on a curator's profile and change nothing, which is the fun of them.

**Voice of the People** is the critics' award: most upvotes earned across the whole festival. It is not on the ballot — it's counted from the upvote rows. Everyone is eligible, curators included.

### 1.6 Sweeps allowed ✅

No cap on awards per film. With only one award that scores, a sweep costs nothing structurally and is true to how the Oscars actually go some years.

### 1.7 Open vs closed festivals ✅

The president chooses. **Closed** is invite-only by code. **Open** festivals are discoverable by any signed-in user and let strangers take a free curator seat up to the cap.

---

## 2. Festival state machine

```
DRAFT ──► RECRUITING ──► NOMINATING ──► LINEUP_SET ──► SCREENING
                                                          │
                              ARCHIVED ◄── CEREMONY ◄── AWARDS_VOTING
```

| State | What members see | Advanced by |
|---|---|---|
| `DRAFT` | Set up, not yet open | President |
| `RECRUITING` | Seats filling | President |
| `NOMINATING` | Countdown, one pick each, a filed-count with no titles | President |
| `LINEUP_SET` | Lineup drawn, curators revealed, clock scheduled | President |
| `SCREENING` | The dashboard: current film, its window, its countdown | **The clock** |
| `AWARDS_VOTING` | Ballot, one pick per category | President |
| `CEREMONY` | Reveal, then profiles update | **President** |
| `ARCHIVED` | Retrospective | President |

The president sees results before publishing but **cannot alter them** — `publish_festival()` computes and writes winners inside Postgres, and there is no update path to `award_results`. Publish is a release valve, not an edit.

**The president's UI is one button.** Whatever the festival is waiting on, and nothing else. Everything they *could* do later stays hidden until it's the thing to do. `SCREENING` deliberately has no button that does anything until the last film closes — the clock is doing the work and the right action is to leave it alone.

---

## 3. API architecture

### 3.1 TMDB — core
Proxied through Next.js route handlers so the key never reaches the browser. Server cache (24h details, 7d credits) keeps us far under the ~40 req/s IP limit.

- `/search/movie` — nomination search
- `/movie/{id}?append_to_response=credits,watch/providers` — metadata, cast, crew, *and* streaming availability in one call
- Footer attribution: "This product uses the TMDB API but is not endorsed or certified by TMDB."

**Until the key arrives:** falls back to TMDB-shaped fixtures on the same code path when `TMDB_API_KEY` is unset.

### 3.2 External critic scores — none configured
OMDb was removed on 2026-08-19: its CC BY-NC licence does not survive shipping under a limited company. The provider seam in `lib/scores.ts` is kept but nothing is wired to it. **Nothing in the festival model depends on a critic score** — the slate algorithm that consumed it is gone, and TMDB's `vote_average` is now shown for context only.

### 3.3 Trakt — deferred
OAuth watch verification. Less useful than it was: eligibility is now enforced window by window rather than by a completion gate.

### 3.4 Wikipedia / Wikidata — wiki seeding
CC0, no key. Director bios and movement definitions pulled as **starting drafts for hand-editing** — never publish raw API text.

### 3.5 Discord — webhooks only
One webhook per guild, posting festival events as rich embeds: nominations opening, the lineup reveal, each film's windows, winners. 30 msg/min ceiling, far above our volume. **No in-app chat.**

### 3.6 Letterboxd — CSV import
No usable API, but every user can export their diary, so an upload gives profile enrichment with no approval needed.

**Not viable, for the record:** IMDb official (~$150k/yr), Rotten Tomatoes direct (~$60k/yr enterprise).

---

## 4. Screens

### A. Dashboard — *the centre of the app*
The one question it answers: **what do I owe, and how long have I got?**

- Current film, its phase, and a large countdown on whatever window is open
- The single action that phase asks for — mark watched / file 200 characters / spend 3 upvotes — and nothing else
- Standing: upvotes earned, reviews filed, films watched, festival awards
- "Coming next" with the next film's opening countdown (title withheld — no reading ahead)
- The lineup, with each film's phase and how far the festival has got

### B. Nomination
One pick. TMDB search, theme catalog to browse, and a filed-count (`6 / 8 curators`) that never shows titles.

### C. Ballot + ceremony
- **Ballot:** one card per category, lineup films as options. Unwatched films get a nudge, not a lock.
- **Ceremony:** full-bleed Oscar-card reveal, one award per screen, honorary first, Best of the Fest, then Voice of the People closing the night. Ends on the curator tally.

### D. Guild home
The president's single next move up top, the curator approval queue under it, then one clear destination for everyone else. Roster split into curators and critics, because they're different jobs.

### E. Wiki / film school
Theme pages: definition, legacy, 4 canonical examples with posters. Open to everyone, no membership required — top of funnel.

### F. Profile
Festivals won, Voice of the People wins, upvotes earned, and the full award list with the scoring one marked.

---

## 5. Build status

| Phase | Work | Status |
|---|---|---|
| **0** | Scaffold, design tokens, logo | ✅ |
| **1** | Fixtures + TMDB client, mock guild | ✅ live TMDB |
| **2** | Nomination | ✅ rebuilt for one-film-per-curator |
| **3** | Festival setup wizard | ✅ rebuilt, sliders removed |
| **4** | Ballot + ceremony | ✅ rebuilt for the two awards |
| **4b** | **Dashboard + per-film cycle** | ✅ new |
| **5** | Wiki — all 65 categories | ✅ |
| **6** | Discord panel, deploy | ✅ |
| **7** | Backend: auth, database, persistence | ✅ |
| **8** | Festival model migration | ✅ `schema-06-festivals.sql` |

---

## 6. Deferred

- Public/open leagues beyond one guild — needs its own structure
- Trakt watch verification; Letterboxd CSV import
- The category quiz and guild collections
- Gamified tiers (gold/silver/bronze critic) — the data is there in `critic_standings()`, the presentation is not
- Live synced ceremony reveal — ruled out, needs real-time transport
- Season-category vote during `ARCHIVED`

---

## 7. Open questions

- **Cadence drift.** A president who sets a month per film and seats 12 curators has built a year-long festival. The wizard states the total length up front, but nothing stops it.
- **Curator no-shows.** A curator who never files simply isn't in the lineup. The festival shrinks silently; there is no nudge and no penalty.
- **The 3-upvote rule needs 4+ eligible reviews per film** to be satisfiable by everyone. Small or quiet guilds can deadlock into a round where nobody's review stays eligible.
