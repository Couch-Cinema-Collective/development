# Couch Cinema Collective — Prototype Plan

**Status:** decisions locked, ready to build
**Target:** clickable Next.js prototype, four flows, live TMDB

---

## 0. Product thesis

**A film society with an awards night — not a fantasy league with a standings table.**

The founding doc opens on a fantasy-football analogy, but the mechanics we've settled on deliberately strip out the game scaffolding: no invented point currency, no equity weighting, no anti-sweep rules. What's left is closer to a serious film club that happens to run on a season clock. Recognition comes from *awards your nominations won*, which is a fact about the season rather than a score we made up.

This matches the brand — institutional, black/white/red, PBS-serious — better than a leaderboard would.

---

## 1. Core mechanics

### 1.1 One nomination round, with stacking ✅

Nominating and electing are the same act. Every member gets **5 nomination points** to distribute freely:

- 5 films × 1 point — broad and hedged
- 1 film × 5 points — all-in conviction bet
- 3 / 1 / 1 — anything between

Points sum across the guild. Duplicate titles merge into one pool entry; **the backend records every nominator and their stake**, which is what feeds award credits later. Highest totals fill the slate.

The nomination pool shows point totals but **hides who nominated what until lock**. Hidden information is what makes the round a game rather than a survey.

### 1.2 Slate algorithm — two terms

```
FilmScore = (w_guild  × normalized_nomination_points)
          + (w_critic × normalized_external_score)
```

- **`w_guild`** — the guild's own conviction. Default **80%**.
- **`w_critic`** — external critic opinion. Default **20%**, sourced from TMDB's `vote_average`. A licensed provider can be added behind the seam in §3.2.

No drought term. Commissioner gets two sliders and a live preview of how the slate shifts as they drag. Defaults ship sane; nobody is forced to engage with it.

### 1.3 Award credits — a count, not a currency ✅

When a film wins an award, **every member who nominated it is credited with that award.** Full credit to each nominator regardless of how many points they staked or how many others nominated the same film — weighting it would reintroduce the machinery we deliberately cut.

Two surfaces:

**Ceremony close — this season's tally**
```
TONIGHT'S NOMINATORS
  Jack     ●●●●   4 winners
  Dev      ●●●    3 winners
  Sarah    ●●     2 winners
  Miller   ●      1 winner
```

**Profile — lifetime record**
```
JACK NAGEL          12 awards · 6 seasons

  BEST PICTURE      Toy Story          S3
  BEST DIRECTOR     Spirited Away      S3
  BEST EDITING      Akira              S2
  ...

  Most nominated director   Wes Anderson
  Most nominated actor      Brad Pitt
```

The profile-that-grows-over-time from the doc falls straight out of this — it's all derivable from stored nomination records.

### 1.4 Sweeps allowed ✅

No cap on awards per film. If the guild's favorite takes eleven of fifteen, that's a real result and true to how the Oscars actually go some years. With no points race to lopside, a sweep costs nothing structurally.

### 1.5 Voting eligibility

The doc's rule: *"If you don't finish the movies, you just don't get to vote."* Three commissioner-selectable levels:

- **Honor system** (default) — self-attest per film
- **Trakt-verified** — OAuth against real watch history (phase 2)
- **Open** — anyone votes

### 1.6 Guild size — hard cap at 50 ✅

Enforced. Past ~50, popular films get nominated by so many people that individual picks stop mattering.

*Consequence to revisit:* this blocks the large public leagues ("League of North America") the doc floats. Those would need a different structure — likely a separate tier with its own rules rather than a bigger guild.

### 1.7 Ties — expand the slate ✅

Two films tied for the last spot means the season runs seven films instead of six. Nobody's pick dies on a technicality, and nobody has to make an awkward call.

---

## 2. Season state machine

```
DRAFT ──► NOMINATING ──► TALLYING ──► SLATE_LOCKED ──► WATCHING
                                                          │
                              ARCHIVED ◄── PUBLISHED ◄── VOTING
```

| State | What members see | Advanced by |
|---|---|---|
| `DRAFT` | Invite-only lobby | Commissioner |
| `NOMINATING` | Countdown, 5 points to spend, live pool (nominators hidden) | Auto |
| `TALLYING` | "Slate being calculated" | Auto |
| `SLATE_LOCKED` | The films, nominators revealed, watch-provider links | Commissioner |
| `WATCHING` | Progress checklist, per-film discussion | Auto |
| `VOTING` | Ballot, one pick per award category | Auto |
| `PUBLISHED` | Ceremony reveal, profiles updated | **Commissioner** |
| `ARCHIVED` | Retrospective, next-season category vote | Auto |

Per the doc: the commissioner sees results before publishing but **cannot alter them**. Publish is a release valve, not an edit. Built as a hard constraint from day one.

---

## 3. API architecture

### 3.1 TMDB — core
Proxied through Next.js route handlers so the key never reaches the browser. Server cache (24h details, 7d credits) keeps us far under the ~40 req/s IP limit.

- `/search/movie` — nomination search
- `/movie/{id}?append_to_response=credits,watch/providers` — metadata, cast, crew, *and* streaming availability in one call
- Footer attribution: "This product uses the TMDB API but is not endorsed or certified by TMDB."

**Until the key arrives:** falls back to TMDB-shaped fixtures on the same code path when `TMDB_API_KEY` is unset. Drop the key in `.env.local` and it's live — no rework.

### 3.2 External critic scores — none configured
The critic term is TMDB's own `vote_average`. Nothing else is wired up.

OMDb was removed on 2026-08-19: its CC BY-NC licence does not survive shipping under a limited company. Building it behind a **provider interface** meant removal was deleting one implementation, not a redesign — every call site is untouched and `w_critic` falls back to TMDB.

### 3.3 Trakt — phase 2
OAuth watch verification (§1.5). Cross-references TMDB IDs, slots in cleanly.

### 3.4 Wikipedia / Wikidata — wiki seeding
CC0, no key. Director bios and movement definitions pulled as **starting drafts for hand-editing**. The doc is explicit that the wiki should feel crowdsourced, not machine-generated — never publish raw API text.

### 3.5 Discord — webhooks only
One webhook per guild, posting season events as rich embeds: draft opens, 24h warning, nominations locked, slate revealed, voting opens, winners published. 30 msg/min ceiling, far above our volume.

**No in-app chat.** Discord has no embeddable widget for external sites, and members already have group texts and servers. Push events to where they already talk.

### 3.6 Letterboxd — CSV import
No usable API. But every Letterboxd user can export their full diary and ratings, so an upload gives us the profile enrichment in §1.3 with no approval needed.

**Not viable, for the record:** IMDb official (~$150k/yr, AWS Data Exchange), Rotten Tomatoes direct (no self-serve, ~$60k/yr enterprise).

---

## 4. Screens

### A. Commissioner season setup
Four-step wizard: identity → format → awards → invite.
- Guild name, season title, category picker (browse ~80 categories, or take the quiz)
- Duration + film count, presets surfaced as one-click: **3mo / 6 films** (default), 1yr / 12 films, 2wk / 1 film rolling
- Award toggles, capped at 15, Best Picture locked on, custom award creator
- Two algorithm sliders with live slate preview
- Invite link + Discord webhook
- Member counter enforcing the 50 cap

### B. Nomination draft — *build first*
- Prominent countdown to lock
- TMDB search: poster, year, director, runtime, streaming availability
- **5 point chips dragged onto films** — the stacking mechanic made physical
- Live pool with totals, nominators concealed until lock

### C. Voting + ceremony
- **Ballot:** one card per category, slate films as options, eligibility gate up top
- **Ceremony:** full-bleed Oscar-card reveal, one award per screen, black card / red accent / envelope beat. Closes on the nominator tally (§1.3).

**Delivery — all four wanted, but they don't all fit in phase 4:**

| Mode | Phase | Why |
|---|---|---|
| Scrollable Oscar cards in-app | 4 | The core build; everything else derives from it |
| Exportable PDF | 4 | Renders from the same card components |
| Shareable result graphics | 4 | Same components at social dimensions |
| **Live synced reveal** | **7** | Needs persistence + real-time transport, which don't exist yet (§7) |

The live reveal is the one that cannot be faked on fixtures: "everyone's screen advances together" requires shared server state and a websocket or polling channel. It is deferred to after the backend, not dropped.

### D. Wiki / film school
- Category pages: definition, legacy, 4 canonical examples with posters
- Director and movement pages
- Open to everyone, no membership required — top of funnel

### E. Profile
Lifetime award record, most-nominated director/actor, seasons played. Grows from stored nomination data.

---

## 5. Build order

| Phase | Work | Status |
|---|---|---|
| **0** | Next.js + Tailwind scaffold, design tokens, logo + pattern | ✅ Done |
| **1** | Fixtures + TMDB client, season state machine, mock guild | ✅ Done — **live on real TMDB** |
| **2** | Nomination draft (B) — point-chip mechanic | ✅ Done |
| **3** | Commissioner setup (A) + weighting slider w/ live preview | ✅ Done |
| **4** | Ballot + ceremony (C): in-app cards, PDF, share graphics | ✅ Done |
| **4b** | In-season room: watch tracking + member reviews | ✅ Done |
| **5** | Wiki (D) — all 65 categories, live TMDB exemplars | ✅ Done |
| **6** | Discord panel (link-out + widget + webhook), deploy | Panel done; deploy next |
| **7** | **Backend**: auth, database, persistence | See §7 |

Live synced reveal is dropped, not deferred — Jack ruled out real-time.

Phase 2 led deliberately: if dragging five points onto films isn't fun, better to learn that before building four screens around it.

---

## 7. The backend fork

Nothing persists. Every guild, member, season, and nomination is a fixture file;
spending five points and refreshing loses them. That is correct for a prototype
and wrong for anything a real club touches.

Going real means auth, a database, working invite links, and a hosting decision —
roughly a week, and worth holding until the full loop has been seen end to end.
The live synced ceremony reveal depends on it.

---

## 6. Deferred

- Public/open leagues beyond 50 members — needs its own structure (§1.6)
- Trakt watch verification
- Letterboxd CSV import
- The ~80-category library — 12 seeded, **the full list is Jack's to supply**
- The category quiz and guild collections (two of the three category-picking paths)
- Final award list and ceremony announcement order — **also Jack's to supply**
- Season-category vote during `ARCHIVED`
