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
Film festival with friends
```
*26 characters.*

## Promotional text (170 max — editable without a new build)

```
Establish a guild. Premiere your own festival. Find out which of you actually
has the taste.
```

## Keywords (100 max, comma-separated, no spaces after commas)

```
film,movie,club,cinema,awards,voting,watchlist,oscars,guild,festival,nominate,review,critic,curator
```
*97 characters. Do not include "Couch Cinema" — the name is already indexed.*

## Description (4000 max)

```
Couch Cinema Collective turns watching films with your friends into a festival
with stakes.

Your guild programmes a lineup, watches it one film at a time on a shared
schedule, and finishes the way it should — with an awards ceremony you vote on
yourselves.

TWO CHAIRS

Curator. You put up exactly one film, and you defend it. Think producer rather
than critic: you stake your name on a pick, and if it takes Best of the Fest
you have won the festival. A guild seats up to twelve curators, and the
lineup is simply what all of you chose.

Critic. You are the voting body. Watch every film, write two hundred
characters on it, and spend three upvotes on the reviews that earned them.
Room for fifty a guild. Every curator is a critic too — curating is the extra
job, not the alternative.

HOW A FESTIVAL RUNS

One film at a time, on a calendar everyone can predict. Each film screens for
about a fortnight, spanning two weekends, and you write it up while you watch.
Reviews go up anonymously, and from Monday to Wednesday the guild votes on
them — you upvote the writing, not the writer, because nobody knows who wrote
what until voting closes. Then the next film opens on Thursday morning.

Miss a window and you miss that round. That is the whole eligibility system.

TWO THINGS TO WIN

Best of the Fest is the only award that scores. It settles the festival, and
it belongs to the curator who put the winning film up. Every other award —
Best Director, Best Score, or anything your guild invents — is honorary: a
real trophy that counts for nothing, which is the fun of it.

Voice of the People goes to whoever earned the most upvotes across the whole
festival. Curators compete for it alongside everyone else, because the writing
stands on its own.

Both go on your profile permanently, festival after festival.

THE FILM COLLECTION

More than a hundred themes to build a festival from — Italian Neorealism, Body
Horror, Hong Kong Action, the Coen Brothers, Pre-Code Hollywood — each with a
plain definition and four films that demonstrate it. Not a ranking. A starting
point, and a decent way to find your next watch between festivals.

BUILT FOR SMALL GROUPS

Guilds are private and invite-only. Curator seats are deliberately scarce, so
every pick in the lineup belongs to someone who has to answer for it.

Couch Cinema Collective is free, with no purchases and no subscriptions. It
does not stream or play films — you watch through whatever services you
already use.

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

The full answer to Apple's seven questions lives in `appstore/REVIEW-NOTES.md`
— paste sections 3 through 7 of that file into the Notes field, plus the demo
credentials below.

```
Demo account (already a member of a guild with a festival in progress):
  Email:    appreview@couchcinemacollective.com
  Password: ReviewDemo!2026

President account, for the organiser-only controls:
  Email:    demo.president@couchcinemacollective.com
  Password: ReviewDemo!2026
```

Create both with `node scripts/seed-review-demo.mjs`, which also seeds the
guild, the festival, the lineup and a closed film with a revealed review
thread. Without it a reviewer signs in to an empty account and can see none of
the core features — the most likely reason the first submission was rejected.

Sign in with Apple is offered alongside Google, per guideline 4.8. Account
deletion is available in-app under Profile → Danger Zone, per 5.1.1(v).

Push notifications are used only for festival events within a member's own
guild — a film opening, a deadline approaching, results being published.

## Before submitting — do not skip

1. **Run `node scripts/seed-review-demo.mjs`** and confirm you can sign in as
   the demo account on a real device. An app that hides everything behind a
   login and ships without working credentials is a near-certain rejection,
   and appears to be what happened the first time.
2. **Record the screen capture** described in `REVIEW-NOTES.md` §1, on a
   physical device running current iOS. Not the Simulator.
3. **Paste the updated description above** — the old copy described the
   five-point season model and no longer matches the app. A description that
   does not match the app is its own rejection under Guideline 2.3.
4. **Fill in the tested-devices list** in `REVIEW-NOTES.md` §2.
5. Confirm push notifications actually deliver on a physical device.
6. Read the Guideline 1.2 note at the end of `REVIEW-NOTES.md`. The app has
   user-generated reviews but no reporting or blocking mechanism, which is the
   most likely cause of a second rejection.

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
