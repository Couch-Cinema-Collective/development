# App Review Information

Everything Apple asked for in the rejection, in their order. Sections 3–7 are
paste-ready into the **Notes** field of App Review Information. Sections 1 and 2
need you to do something first — see the checklists.

**Most likely reason this was rejected:** the submission went in without demo
credentials. Couch Cinema Collective shows a landing page and a public film
wiki when signed out, and nothing else. A reviewer with no account cannot see
a single core feature, so there was nothing to review. Fix that first
(`node scripts/seed-review-demo.mjs`), then answer the rest.

---

## 1. Screen recording — you have to capture this

Record on a **physical device running the current iOS**, not the Simulator.
Apple asks for this explicitly and rejects Simulator captures.

Set up first:

```bash
node scripts/seed-review-demo.mjs
```

That prints the reviewer credentials used below and puts the demo guild
mid-festival, so the recording has something real to show.

Capture (Settings → Control Center → add **Screen Recording**, then swipe down
and tap the record button). Take it in one pass, roughly three to five minutes:

1. **Launch from the home screen** — Apple wants the cold start on camera.
2. **Landing page**, then tap *Sign in*.
3. **Sign in** with the demo account. Show the email/password form. Also show
   that *Sign in with Apple* and *Continue with Google* exist — do not tap them
   during the recording, since OAuth leaves the app.
4. **Guild home** — roster of curators and critics, the festival in progress.
5. **Dashboard** — the film currently screening, its countdown, marking it
   watched, and typing a 200-character review. This is the core loop; give it
   the most time.
6. **A closed film** — open it from the lineup to show reviews revealed with
   their authors and upvote counts. This is the user-generated content Apple
   asks about.
7. **Profile → Delete account** — open the confirmation, show the warning
   text. **Do not confirm**, or you will destroy the demo account mid-take.
8. **Push permission prompt**, if it has not already been accepted on that
   device. It is the only system permission the app requests.

Nothing else in the app triggers a permission prompt, and there is no purchase
flow to record — see sections below.

Upload the file to App Store Connect, or host it somewhere with no login and
paste the link in the Notes field.

---

## 2. Devices and OS versions tested — fill this in

Apple wants specifics. Replace with what you actually used; do not guess.

```
Tested before submission on:
  • iPhone [MODEL] — iOS [VERSION]   (physical device)
  • iPad [MODEL] — iPadOS [VERSION]  (physical device)   ← delete if untested
  • iPhone 16 Pro Max — iOS [VERSION] (Simulator, layout only)
```

If you have only tested on one physical device, say exactly that. Listing
devices you did not test is worse than a short list.

---

## 3. What the app does, and who it is for

```
Couch Cinema Collective is a private film club for small groups of friends.

The problem it solves: film clubs collapse because nobody agrees what to
watch, nobody watches on schedule, and there is no reason to finish. The app
fixes all three with structure borrowed from film festivals and fantasy
sports.

A "guild" is a private group of 4-12 curators and up to 50 critics. Each
curator submits exactly one film. Those films become the festival lineup, and
the guild watches them one at a time on a shared schedule: about two weeks to
watch each film and write a short review, then Monday to Wednesday for members
to vote on each other's reviews. When every film has screened, the group votes
on awards and the results are published in an awards ceremony.

There are two things to win. The curator whose film takes "Best of the Fest"
wins the festival. The member whose reviews earn the most votes wins "Voice of
the People". Both are permanent entries on a member's profile.

Target audience: adults who already watch films with friends and want a reason
to keep doing it. It is a social and organisational tool, not a streaming
service or a video player. The app never plays, hosts, streams, or links to
pirated video of any kind. Members watch films through whatever legal service
they already subscribe to, entirely outside the app.
```

---

## 4. How to set up and reach the main features

```
The app is private by design: signed out, a reviewer sees only the landing
page and a public film-reference wiki. A demo account is required to see
anything else. Use the account below — it is already a member of a guild with
a festival in progress, so every core screen is populated.

  Sign in with:  appreview@couchcinemacollective.com
  Password:      ReviewDemo!2026

No sample files, hardware, or special network are needed.

Where to find each feature after signing in:

  • Guild home (tap the guild name on the welcome screen)
      The roster, split into curators and critics, and the festival status.

  • Dashboard (top navigation, or the button on the guild home)
      The core screen. Shows the film currently screening, a countdown to its
      deadline, a control to mark it watched, and a 200-character review box.
      Below that is the full festival lineup and this member's standing.

  • A closed film (tap any film marked "Closed" in the lineup)
      Reviews with their authors and vote counts revealed. Reviews are
      anonymous while voting is open and attributed once it closes.

  • Ballot and ceremony (appear automatically when the festival reaches those
      stages; not reachable in the demo guild's current stage)

  • Profile (top navigation)
      Lifetime record, and "Delete account" under Danger Zone. Deleting is
      immediate and permanent — please do not run it on the demo account, or
      later review passes will have no account to sign in with.

  • Film collection (top navigation) — open without an account.

A second account with guild-president permissions is available if you need to
see the organiser-only controls (setting the festival theme, drawing the
lineup, opening the festival, publishing the ceremony):

  Sign in with:  demo.president@couchcinemacollective.com
  Password:      ReviewDemo!2026
```

---

## 5. External services used

```
  • Supabase — authentication (email/password, Sign in with Apple, Google) and
    the Postgres database holding guilds, festivals, reviews and votes.
    Provider of record for all user data.

  • The Movie Database (TMDB) — film metadata only: titles, release years,
    directors, cast, runtimes and poster artwork. Used under the TMDB API
    Terms of Use, with the required attribution shown in the app footer:
    "This product uses the TMDB API but is not endorsed or certified by TMDB."
    No user data is ever sent to TMDB; the app only sends film queries.

  • Vercel — web hosting and server-side rendering. Keeps standard request
    logs.

  • Apple Push Notification service (APNs) — the only notification channel.
    Used solely for events inside a member's own guild: a film opening, a
    deadline approaching, results being published.

  • Discord (optional, off by default) — a guild organiser may add a Discord
    webhook so festival announcements post to their own server. Outbound
    messages only; the app never reads Discord content and the integration is
    entirely optional.

There are no analytics SDKs, no advertising SDKs, no third-party trackers, no
AI or machine-learning services, and no payment processing of any kind. The
app is free, contains no in-app purchases or subscriptions, and has no paid
tier or paywalled content.
```

---

## 6. Regional differences

```
The app functions identically in every region. There is no
geo-gating, no region-locked content, and no regional pricing — the app is
free everywhere with no purchases.

The only variation is incidental: TMDB returns film metadata localised to the
device language where a translation exists, and falls back to English
otherwise. Every feature, screen and permission behaves the same worldwide.

The app is English-language only at this time.
```

---

## 7. Regulated industry and third-party material

```
The app does not operate in a regulated industry. It involves no health,
financial, gambling, medical, lending, or similar regulated activity.

Regarding third-party material: the app displays film titles, credits and
poster artwork supplied by The Movie Database (TMDB) through their public API,
used under the TMDB API Terms of Use with the attribution TMDB requires
displayed in the app. Poster images are served from TMDB's own image CDN and
are not copied, cached, modified or redistributed by the app.

The app does not host, stream, play, download, or link to any film or video
content. It is an organisational tool for people who watch films through the
legal services they already use. No licence to distribute film content is
required because no film content is distributed.

User-written reviews are limited to 200 characters, are visible only to other
members of the same private guild, and are never public.
```

---

## Before you resubmit — a real risk to fix

**The App Store description does not match the app.** The current listing
still describes the previous design: five nomination points per member, a
slate cut by an algorithm, fifty-member guilds, a "season". None of that
exists any more. Reviewers compare the description to the app, and a mismatch
this large is its own rejection under Guideline 2.3 (Accurate Metadata).
Updated copy is in `appstore/LISTING.md` — paste it before resubmitting.

**User-generated content requirements (Guideline 1.2).** The app carries
user-written reviews, which makes it a UGC app in Apple's terms. Apple
requires four things, and the app currently has one:

| Requirement | Status |
|---|---|
| Published contact info | ✅ hello@couchcinemacollective.com, on the privacy page |
| A way to report offensive content | ❌ not built |
| A way to block abusive users | ❌ not built |
| A method for filtering objectionable material | ❌ not built |

Reviews are only visible inside a private, invite-only guild of at most 62
people, which is a genuine mitigating argument and worth stating if Apple
raises it. But it is not a guarantee of approval, and this is the most likely
cause of a second rejection even after the questions above are answered.
