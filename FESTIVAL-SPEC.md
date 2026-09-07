# Festival Spec v2 — the weekly game

The authoritative rules for the festival rebuild (2026-09-07). Every session
building product works from this file; change it here first. Items marked
**OPEN** have a proposed default — build to the default unless John overrides.

Sequencing decision: this spec ships web-side first; the SwiftUI native app
is built second, against the schema and API this produces.

## Structure

- **One film per week, no exceptions.** Festival length = film count.
- **4–8 films** per festival (president picks the target).
- **4–30 participants.** Everyone is a critic; the nominators of selected
  films are additionally curators. Curator identities stay anonymous until
  the ceremony publishes.
- Everyone reviews and votes regardless of role.
- **Penalty:** miss a film (not marked watched by its deadline) and you can't
  win, but the film stays in the festival.
  - **OPEN** — scope of "can't win". Default: ineligible for Best Film (as
    curator) and Best Critic; reviews/votes still welcome and still count
    for others.
- **Guilt-trip push notifications** as the enforcement mechanism (escalating
  reminders as a deadline nears, a "the guild watched without you" after).
- Calendar is fixed **Pacific time** (existing decision).

## Awards

- Two main awards: **Best Film** (curators compete) and **Best Critic**
  (everyone competes via review upvotes + Best Review votes).
- Before the festival opens, the president may add **up to 10 extra awards**:
  any Oscar category, or fully custom ones. They appear on the final ballot.
  - **OPEN** — the source text reads "they will affect the point total for
    the two main awards", which contradicts the two-award scoring design.
    Default: extra awards are **honorary** — ballot categories with revealed
    winners, no effect on Best Film / Best Critic totals.
- Acting categories: one performer per film, pre-filled from internet
  consensus; the **president can edit nominee names**.

## Nomination flow

- President sets the nominations-open date/time and the film count.
- **3-day window**, one film per participant.
- **First to nominate a title claims it** — no duplicates.
- Nominations appear on a **live grid in real time, anonymously**.
- Each nomination card: film name, year, director, description, score, and an
  optional 200-char **Producer's Pitch**.
  - Note: metadata comes from our existing TMDB pipeline (description =
    TMDB overview; score = IMDb via the external-scores fetch). We do not
    have an IMDb API license; labels must say what the data actually is.
- If more films are nominated than the target: **rank-choice vote** narrows
  the slate to the target count.
  - **OPEN** — mechanics. Default: every participant ranks all nominated
    films; instant-runoff elimination of the lowest until the target count
    remains; a 24-hour ranking window after nominations close.

## Weekly loop (all times Pacific)

| Day | What happens |
|---|---|
| **Wednesday** | New film's window opens. Previous week's reviews revealed with authors. Best Critic leaderboard updates. |
| **Wed–Sun** | Watch window. Watching ahead allowed; reviews saved as drafts. |
| **Sunday** | Reviews lock. Upvoting opens. |
| **Mon–Tue** | Upvote reviews (secret ballot). |
| **Wednesday** | Points revealed; next window opens. |

- Reviews are **anonymous until their watch window closes** (no group-think).
- Upvote counts are **hidden until the Wednesday reveal**.

## Reviews and scoring

- **200-character** reviews, one per person per film.
- Two upvote types: **Most Insightful** and **Funniest**.
- **3 votes per type per week**, freely allocated — stacking on one review
  is allowed. Both types score **1 point each** toward Best Critic.
- Curators get a 200-char **campaign bio** ("why I picked it") shown on the
  film's carousel card.

## Ceremony

- After the last week: **3-day final ballot** — Best Film (all films),
  Best Review (top-upvoted reviews of the season), plus any extra awards.
  - **OPEN** — "top upvoted" cutoff. Default: the 10 highest-scoring
    reviews of the season.
- **Best Film**: most ballot votes; ties stand.
- **Best Critic**: season leaderboard points + 1 point per Best Review
  ballot vote; highest total wins; ties stand.
- Results compile into a **stylized PDF** in CCC brand: per category — the
  nominees page, an "And the Award Goes To…" page, then the winner page.
- The **president receives the PDF when voting closes** and schedules the
  publish date/time; participants see a **countdown** to the reveal.
- On publish: winners on the Ceremony page, PDF downloadable by all
  participants, every curator identity revealed, all award winners listed,
  and Best Film / Best Critic recorded on the winners' profiles.

## Out of scope for the web rebuild

- The SwiftUI native app (separate phase, after this ships).
- The Film Collection wiki (web-only; already hidden in the iOS shell).
