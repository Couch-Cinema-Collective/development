import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Couch Cinema Collective",
  description: "What Couch Cinema Collective collects, why, and how to delete it.",
};

/**
 * Required by App Store Connect before an app can be submitted, and by the
 * privacy questionnaire Apple attaches to the listing. Kept deliberately
 * plain — it should describe what the code actually does.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">Legal</p>
        <h1 className="mt-3 text-5xl font-medium uppercase leading-none tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-ink-faint">Last updated 19 August 2026</p>
      </header>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-ink-soft">
        <Section title="Who we are">
          <p>
            Couch Cinema Collective is operated by{" "}
            <strong className="text-ink">ConcertBuddy.ai LLC</strong>, which is
            the data controller for everything described below. Where this
            policy says &ldquo;we&rdquo;, it means that company.
          </p>
        </Section>

        <Section title="The short version">
          <p>
            We store the least we can get away with: who you are, which guilds
            you belong to, and the films and reviews you contribute. We do not
            sell it, we do not advertise against it, and you can delete all of
            it from your profile page at any time.
          </p>
        </Section>

        <Section title="What we collect">
          <ul className="space-y-3">
            <Item label="Account">
              Your email address and display name. If you sign in with Google or
              Apple, we receive those from the provider — we never see your
              password.
            </Item>
            <Item label="Guild activity">
              The guilds you join, the films you nominate and how many points you
              staked, which films you mark as watched, your reviews and ratings,
              your upvotes, and your ballots.
            </Item>
            <Item label="Technical">
              Standard server logs kept by our hosting provider. We run no
              analytics, no tracking pixels, and no advertising SDKs.
            </Item>
          </ul>
        </Section>

        <Section title="Who else is involved">
          <ul className="space-y-3">
            <Item label="Supabase">
              Stores your account and all guild data. Access is enforced by
              row-level security, so members only ever read their own guilds.
            </Item>
            <Item label="Vercel">Hosts the site and keeps request logs.</Item>
            <Item label="TMDB">
              Provides film metadata, artwork and ratings. We request film
              information from them; we never send them anything about you.
            </Item>
            <Item label="Discord">
              Only if your guild connects a server. Festival announcements are
              posted to the channel you nominate. We do not read your messages.
            </Item>
          </ul>
        </Section>

        <Section title="Ballots, nominations and reviews">
          <p>
            Nominations are hidden from other members until the lineup is set,
            and ballots stay sealed until the results are published. Reviews are
            anonymous while their film&apos;s voting window is open — your name
            is attached only once that window shuts. All three are enforced in
            the database, not just the interface.
          </p>
        </Section>

        <Section title="Deleting your account">
          <p>
            Go to your profile and choose <strong>Delete account</strong>. This
            removes your account and everything attached to it — nominations,
            reviews, upvotes, ballots, and guild memberships — immediately and
            permanently. There is no recovery, and we keep no
            shadow copy.
          </p>
          <p className="mt-3">
            Awards already announced at a published ceremony remain part of that
            festival&apos;s record, but are no longer linked to you.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Couch Cinema Collective is not intended for children under 13, and we
            do not knowingly collect their information.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, or want your data sent to you? Email{" "}
            <a
              href="mailto:hello@couchcinemacollective.com"
              className="underline hover:text-signal"
            >
              hello@couchcinemacollective.com
            </a>
            .
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="label-eyebrow">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li>
      <strong className="text-ink">{label}.</strong> {children}
    </li>
  );
}
