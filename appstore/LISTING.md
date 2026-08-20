# App Store listing

Draft copy for App Store Connect. Character limits noted — Apple truncates
silently, so nothing here exceeds them.

---

## Name (30 max)

```
Couch Cinema Collective
```
*23 characters.*

## Subtitle (30 max)

```
A film society with awards
```
*26 characters.*

## Promotional text (170 max — editable without a new build)

```
Nominate the films. Watch on your own time. Hand out the awards yourselves.
A season of cinema, run with your friends.
```

## Keywords (100 max, comma-separated, no spaces after commas)

```
film,movie,club,cinema,awards,voting,watchlist,oscars,society,guild,nominate,ballot,letterboxd
```
*93 characters. Do not include "Couch Cinema" — the name is already indexed.*

## Description (4000 max)

```
Couch Cinema Collective turns watching films with your friends into a season
with stakes.

Your guild nominates a slate of films, everyone watches on their own time, and
it ends the way it should — with an awards ceremony you vote on yourselves.

HOW A SEASON WORKS

Nominate. Every member gets five nomination points to spend however they like.
Spread them across five films, or stake all five on one you're certain about.
The films with the most points make the slate.

Watch. Six films over three months is the recommended shape, but your guild
president sets the pace. No deadlines to fall behind on — watch when you can.
Mark films off as you go, rate them, and write them up. See how your guild's
average compares to the critics.

Vote. When the season closes, the ballot opens. One pick per award, following
the Oscars — craft categories first, Best Picture last. Finish the slate to
unlock your vote.

The ceremony. Results stay sealed until your president publishes them, and
they cannot be edited. Awards are revealed one at a time, and every member who
nominated a winning film is credited with that award.

WHAT MAKES IT DIFFERENT

Recognition comes from what you nominated, not from points we made up. There
is no invented currency and no leaderboard — just the films you backed and the
awards they won, kept on your profile season after season.

THE FILM COLLECTION

Sixty-five categories to build a season from — Spaghetti Westerns, Body
Horror, French New Wave, Korean Cinema, the Coen Brothers — each with a plain
definition and four films that demonstrate it. Not a ranking. A starting
point, and a decent way to find your next watch even between seasons.

BUILT FOR SMALL GROUPS

Guilds cap at fifty members, deliberately. Beyond that, popular films get
nominated by so many people that individual picks stop mattering.

Film data provided by TMDB.
```

## URLs

| Field | Value |
|---|---|
| Support URL | https://www.couchcinemacollective.com |
| Marketing URL | https://www.couchcinemacollective.com |
| Privacy Policy URL | https://www.couchcinemacollective.com/privacy |

## Copyright

```
2026 ConcertBuddy.ai LLC
```

Year of first publication, then the rights holder. Apple adds the © itself —
including one is a common reason the field gets kicked back. The entity, not
the brand: the copyright belongs to the company that owns the developer
account.

## Category

Primary: **Entertainment** · Secondary: **Social Networking**

## Age rating

Expect **12+**. The app itself contains no mature content, but members write
free-text reviews and the films discussed include adult themes. Answer
"Infrequent/Mild" for Mature/Suggestive Themes, and declare user-generated
content.

## App Privacy questionnaire

Declare these as collected and **linked to the user**:

- **Contact Info → Email address** — account creation
- **User Content → Other** — reviews, ratings, nominations
- **Identifiers → User ID** — the Supabase account id

Answer **No** to tracking. There are no analytics, ad SDKs, or third-party
trackers, and nothing is shared with data brokers.

Third parties receiving data: **Supabase** (hosting the account and guild
data) and **Vercel** (server logs). TMDB receives film queries only —
never anything about a user.

## Review notes (the "Notes" field — read by the reviewer)

```
Couch Cinema Collective is a private film club app. Reviewers will need an
account to see past the landing page.

Demo account:
  Email:    [FILL IN]
  Password: [FILL IN]

This account is already a member of a guild with a season in progress, so the
nomination draft, season room, ballot, and ceremony are all reachable.

Sign in with Apple is offered alongside Google, per guideline 4.8. Account
deletion is available in-app under Profile → Danger Zone, per 5.1.1(v).

Push notifications are used only for season events within a member's own
guild — nominations closing, voting opening, and results being published.
```

## Before submitting — do not skip

1. **Create the demo account** and fill it into the review notes above. An app
   that hides everything behind a login and ships without credentials is a
   near-certain rejection.
2. Seed that account's guild with a season far enough along that a reviewer
   can see the draft, ballot, and ceremony.
3. Confirm push notifications actually deliver on a physical device.

---

## SKU

```
couch-cinema-collective-ios
```

Your own internal reference — never shown to users, never searchable, and it
cannot be changed after the app is created. Any unique string works; this one
is readable and leaves room for other platforms later.

## Bundle ID

```
com.couchcinemacollective.app
```

Must match the App ID registered in the developer portal exactly.

## Screenshots

`appstore/screenshots-6.9/` — 1320 × 2868, the size App Store Connect
requires. Upload these three; Apple scales them down for smaller devices, so
one set covers every iPhone.

Captured from the iOS Simulator against the live site, then scaled from the
6.3" capture — the two sizes share an identical aspect ratio (0.4600 vs
0.4603), so nothing is cropped or distorted. Slightly softer than a native
6.9" capture; retake on a Pro Max simulator if it ever bothers you.

`appstore/screenshots/` holds the original 6.3" captures.
