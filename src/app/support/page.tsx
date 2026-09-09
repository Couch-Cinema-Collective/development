import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Couch Cinema Collective",
  description: "Get help with Couch Cinema Collective: contact, common questions, and account issues.",
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I join a guild?",
    a: "Guilds are invite-only. Ask the guild's president for their invite link — one tap and you pick your chair on the way in. To start your own, create a guild from the welcome page and share your link.",
  },
  {
    q: "I can't sign in.",
    a: "The app supports Sign in with Apple, Google, and email. If a sign-in fails, try email with a password reset first. Still stuck? Write to us — include the email address you signed up with.",
  },
  {
    q: "How do I delete my account?",
    a: "Profile → Delete account. This permanently removes your account, reviews, votes, nominations, and memberships. Awards already announced remain part of their festival's record, but are no longer linked to you.",
  },
  {
    q: "Push notifications aren't arriving.",
    a: "Check iOS Settings → Notifications → Couch Cinema, and make sure you accepted the permission prompt on first launch. Reinstalling the app re-registers your device.",
  },
  {
    q: "Something looks wrong or broken.",
    a: "Tell us what you tapped, what you expected, and what happened instead — a screenshot helps enormously. We usually reply within a day or two.",
  },
];

/** Required by App Store guideline 1.5: a working support destination. */
export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">Help</p>
        <h1 className="mt-3 text-4xl font-medium uppercase leading-none tracking-tight sm:text-5xl">
          Support
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
          Questions, trouble signing in, a bug, feedback — we read everything.
        </p>
      </header>

      <section className="mt-10 border border-ink bg-paper-raised p-6">
        <h2 className="label-eyebrow">Contact us</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Email{" "}
          <a
            href="mailto:hello@couchcinemacollective.com"
            className="font-medium text-ink underline hover:text-signal"
          >
            hello@couchcinemacollective.com
          </a>{" "}
          and we&apos;ll get back to you, usually within a day or two.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="label-eyebrow border-b border-rule pb-2">
          Common questions
        </h2>
        <dl className="mt-6 space-y-8">
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt className="text-sm font-medium uppercase tracking-tight">
                {f.q}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-soft">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-12 text-xs leading-relaxed text-ink-faint">
        Privacy questions — what we store and how to remove it — are covered in
        our{" "}
        <a href="/privacy" className="underline hover:text-signal">
          privacy policy
        </a>
        .
      </p>
    </main>
  );
}
