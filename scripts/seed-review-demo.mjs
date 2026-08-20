/**
 * Build the demo guild App Review signs into.
 *
 * An app that hides everything behind a login is reviewed by whatever a fresh
 * account can see — and a fresh account here sees an empty welcome screen,
 * because the whole product is a group activity. This creates a guild that is
 * already mid-festival so the reviewer lands in the real thing: a film
 * currently screening, one already closed with its reviews revealed and its
 * best review decided, and more waiting in the lineup.
 *
 * Creates the reviewer's account plus five other members, so the roster,
 * review thread and upvote counts are all populated by real rows rather than
 * mocked in the UI.
 *
 * Usage:
 *   node scripts/seed-review-demo.mjs                    # create / refresh
 *   node scripts/seed-review-demo.mjs --destroy          # remove it all
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
 * .env.local. The service role bypasses RLS, which is the only way to write
 * another user's rows — never run this against anything but your own project.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── The cast ────────────────────────────────────────────────────────────────
// The reviewer is a plain curator rather than the president: a curator sees
// every member-facing surface, and the president-only controls are visible
// from the second account below if Apple asks for them.
const DEMO_PASSWORD = "ReviewDemo!2026";
const REVIEWER = {
  email: "appreview@couchcinemacollective.com",
  name: "Apple Reviewer",
  role: "curator",
};
const CAST = [
  { email: "demo.president@couchcinemacollective.com", name: "Dana Ruiz", role: "president" },
  { email: "demo.curator1@couchcinemacollective.com", name: "Miller Okonjo", role: "curator" },
  { email: "demo.curator2@couchcinemacollective.com", name: "Sarah Lindqvist", role: "curator" },
  { email: "demo.critic1@couchcinemacollective.com", name: "Nina Patel", role: "critic" },
  { email: "demo.critic2@couchcinemacollective.com", name: "Omar Haddad", role: "critic" },
];

const GUILD_NAME = "The Sunday Couch (Demo)";
const THEME = "Hand-Drawn Animation";

// Real TMDB ids, so posters and metadata resolve exactly as they would live.
const PICKS = [
  { tmdbId: 129, title: "Spirited Away", year: 2001, director: "Hayao Miyazaki" },
  { tmdbId: 149, title: "Akira", year: 1988, director: "Katsuhiro Ôtomo" },
  { tmdbId: 12477, title: "Grave of the Fireflies", year: 1988, director: "Isao Takahata" },
  { tmdbId: 10494, title: "Perfect Blue", year: 1997, director: "Satoshi Kon" },
];

// Reviews for the film that has already closed, so its thread is revealed and
// a best review has genuinely been decided by upvotes.
const CLOSED_FILM_REVIEWS = [
  { email: REVIEWER.email, body: "Watched it twice. The bathhouse does more world-building in eight minutes than most trilogies manage, and nobody explains a thing.", upvotes: 4 },
  { email: "demo.curator1@couchcinemacollective.com", body: "The no-face sequence is the closest animation has come to genuine dread without a single jump scare. Extraordinary control.", upvotes: 2 },
  { email: "demo.critic1@couchcinemacollective.com", body: "Beautiful, and I still cannot tell you what the rules of the spirit world are. I have decided that is the point.", upvotes: 3 },
  { email: "demo.critic2@couchcinemacollective.com", body: "Every frame is doing something. Exhausting in the best way — I had to stop it twice just to look properly.", upvotes: 1 },
];

const destroy = process.argv.includes("--destroy");

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Find a user by email, or create one with a confirmed address. */
async function upsertUser({ email, name }) {
  const { data: list, error: listError } = await db.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;

  const { data, error } = await db.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  return data.user.id;
}

async function deleteUserByEmail(email) {
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = list?.users.find((u) => u.email === email);
  if (found) await db.auth.admin.deleteUser(found.id);
}

/**
 * The Pacific-calendar schedule, mirroring open_festival() in
 * schema-10-calendar-schedule.sql: film one runs to midnight ending the
 * second Sunday, then Monday-Wednesday for critics to vote, then the next
 * film opens Thursday 00:00.
 *
 * Here it is run backwards from an opening date in the past, so the festival
 * is already underway when the reviewer arrives.
 */
function scheduleFrom(openedAt, count) {
  const PT = "America/Los_Angeles";
  // Midnight Pacific on a given calendar day, as a real instant.
  const ptMidnight = (y, m, d) => {
    // Pacific is UTC-7 (PDT) or UTC-8 (PST); resolve by probing the offset.
    const guess = new Date(Date.UTC(y, m, d, 8, 0, 0));
    const local = new Date(
      guess.toLocaleString("en-US", { timeZone: PT }),
    );
    const drift = local.getHours();
    return new Date(guess.getTime() - drift * 3_600_000 + 0);
  };

  const ptParts = (date) => {
    const s = date.toLocaleString("en-US", {
      timeZone: PT,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
    const [wd, md] = s.split(", ");
    const [month, day, year] = md.split("/").map(Number);
    const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
    return { year, month: month - 1, day, dow };
  };

  const { year, month, day, dow } = ptParts(openedAt);
  // The Sunday strictly after opening, then the one after that; viewing ends
  // at midnight ending it, which is 00:00 the following Monday.
  const secondSundayOffset = 7 - dow + 7;

  const out = [];
  let viewStart = openedAt;
  for (let n = 1; n <= count; n++) {
    const voteStart =
      n === 1
        ? ptMidnight(year, month, day + secondSundayOffset + 1)
        : ptMidnight(
            ptParts(viewStart).year,
            ptParts(viewStart).month,
            ptParts(viewStart).day + 11,
          );
    const p = ptParts(voteStart);
    const close = ptMidnight(p.year, p.month, p.day + 3);

    out.push({
      viewing_starts_at: viewStart.toISOString(),
      // No separate review period: writing closes when voting opens.
      review_starts_at: voteStart.toISOString(),
      voting_starts_at: voteStart.toISOString(),
      closes_at: close.toISOString(),
    });
    viewStart = close;
  }
  return out;
}

// ── Teardown ────────────────────────────────────────────────────────────────
async function tearDown() {
  const { data: guilds } = await db
    .from("guilds")
    .select("id")
    .eq("name", GUILD_NAME);
  for (const g of guilds ?? []) {
    // Festivals, nominations, lineup, reviews and votes all cascade.
    await db.from("guilds").delete().eq("id", g.id);
  }
  for (const person of [REVIEWER, ...CAST]) {
    await deleteUserByEmail(person.email);
  }
  console.log("Demo guild and accounts removed.");
}

// ── Build ───────────────────────────────────────────────────────────────────
async function build() {
  await tearDown();

  const president = CAST.find((c) => c.role === "president");
  const ids = {};
  for (const person of [REVIEWER, ...CAST]) {
    ids[person.email] = await upsertUser(person);
    console.log(`  user ${person.email}`);
  }

  // The creator becomes president via the on-insert trigger.
  const { data: guild, error: guildError } = await db
    .from("guilds")
    .insert({ name: GUILD_NAME, created_by: ids[president.email], max_curators: 4 })
    .select("id, invite_code")
    .single();
  if (guildError) throw guildError;
  console.log(`  guild ${guild.id}`);

  for (const person of [REVIEWER, ...CAST]) {
    if (person.role === "president") continue;
    const { error } = await db
      .from("guild_members")
      .insert({ guild_id: guild.id, user_id: ids[person.email], role: person.role });
    if (error) throw error;
  }

  // Opened three weeks ago, so film one has closed and film two is screening.
  const openedAt = new Date(Date.now() - 21 * 86_400_000);
  const windows = scheduleFrom(openedAt, PICKS.length);

  const { data: festival, error: festivalError } = await db
    .from("festivals")
    .insert({
      guild_id: guild.id,
      number: 1,
      title: THEME,
      category: THEME,
      theme: THEME,
      theme_family: "genres",
      visibility: "closed",
      state: "SCREENING",
      film_count: PICKS.length,
      screening_starts_at: openedAt.toISOString(),
    })
    .select("id")
    .single();
  if (festivalError) throw festivalError;

  await db.from("festival_awards").insert([
    { festival_id: festival.id, award_id: "best-of-the-fest", name: "Best of the Fest", tier: "picture", scoring: true },
    { festival_id: festival.id, award_id: "director", name: "Best Director", tier: "direction", scoring: false },
    { festival_id: festival.id, award_id: "score", name: "Best Score", tier: "craft", scoring: false },
  ]);

  // One locked submission per curator, and the lineup those produce.
  const curators = [REVIEWER, ...CAST].filter((p) => p.role !== "critic");
  for (const [i, pick] of PICKS.entries()) {
    const curator = curators[i % curators.length];
    const film = {
      id: pick.tmdbId,
      title: pick.title,
      year: pick.year,
      posterPath: null,
      director: pick.director,
      runtime: 0,
      voteAverage: 0,
      overview: "",
    };

    await db.from("nominations").insert({
      festival_id: festival.id,
      user_id: ids[curator.email],
      tmdb_id: pick.tmdbId,
      film,
      locked: true,
      locked_at: openedAt.toISOString(),
    });

    await db.from("lineup_films").insert({
      festival_id: festival.id,
      tmdb_id: pick.tmdbId,
      film,
      position: i + 1,
      curator_id: ids[curator.email],
      ...windows[i],
    });
  }

  // Film one has closed: give it a full, revealed review thread.
  const closedFilm = PICKS[0];
  const reviewIds = {};
  for (const r of CLOSED_FILM_REVIEWS) {
    const { data, error } = await db
      .from("reviews")
      .insert({
        festival_id: festival.id,
        user_id: ids[r.email],
        tmdb_id: closedFilm.tmdbId,
        body: r.body,
        eligible: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    reviewIds[r.email] = data.id;
  }

  // Upvotes decide the best review. Everyone spends all three, so every
  // review stays eligible and the standings are honest.
  const voters = CLOSED_FILM_REVIEWS.map((r) => r.email);
  for (const voter of voters) {
    const others = CLOSED_FILM_REVIEWS.filter((r) => r.email !== voter)
      .sort((a, b) => b.upvotes - a.upvotes)
      .slice(0, 3);
    for (const target of others) {
      await db.from("review_votes").insert({
        review_id: reviewIds[target.email],
        user_id: ids[voter],
      });
    }
  }

  // Everyone watched the closed film; the reviewer has not yet watched the
  // one currently screening, so they have something to do on arrival.
  for (const person of [REVIEWER, ...CAST]) {
    await db.from("watch_records").insert({
      festival_id: festival.id,
      user_id: ids[person.email],
      tmdb_id: closedFilm.tmdbId,
    });
  }

  console.log("\nDemo ready.\n");
  console.log(`  Sign in:  ${REVIEWER.email}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`  Guild:    ${GUILD_NAME}`);
  console.log(`  Invite:   https://www.couchcinemacollective.com/join/${guild.invite_code}`);
  console.log(`\n  President account (for president-only screens):`);
  console.log(`  ${president.email} / ${DEMO_PASSWORD}\n`);
}

try {
  await (destroy ? tearDown() : build());
} catch (err) {
  console.error("\nFailed:", err.message ?? err);
  process.exit(1);
}
