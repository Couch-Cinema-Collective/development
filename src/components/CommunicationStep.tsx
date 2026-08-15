"use client";

import { useState } from "react";

import { DiscordGuide } from "./DiscordGuide";
import { CopyButton } from "./CopyButton";

type Channel = "discord" | "text" | "email";

const CHANNELS: { id: Channel; label: string; note: string }[] = [
  { id: "discord", label: "Discord", note: "Recommended" },
  { id: "text", label: "Text", note: "Group chat" },
  { id: "email", label: "Email", note: "Old faithful" },
];

/**
 * The season's beats, as ready-to-send messages. Placeholders in [brackets]
 * are the sender's to fill — dates and links the app can't know yet.
 */
function templates(guildName: string, categoryName: string) {
  const guild = guildName || "the guild";
  const category = categoryName || "the season";
  return [
    {
      title: "Nominations open",
      body: `🎬 ${guild} — the ${category} season is on. You have 5 nomination points to spend however you like. Get them in by [date]: [link]`,
    },
    {
      title: "Halfway reminder",
      body: `Halfway checkpoint for ${guild}: [n] films down, [n] to go. If you're behind, tonight's a good night for one. Your ballot only unlocks if you finish.`,
    },
    {
      title: "Voting open",
      body: `🗳️ The ballot is open for ${guild}. One pick per award — you have until [date]. Votes are secret until the ceremony: [link]`,
    },
    {
      title: "Awards announcement",
      body: `🏆 The envelopes open [date/time]. ${guild}'s ${category} season comes down to this — see you at the ceremony: [link]`,
    },
  ];
}

export function CommunicationStep({
  guildName,
  categoryName,
}: {
  guildName: string;
  categoryName: string;
}) {
  const [channel, setChannel] = useState<Channel>("discord");
  const msgs = templates(guildName, categoryName);

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {CHANNELS.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setChannel(c.id)}
              aria-pressed={channel === c.id}
              className={`border px-4 py-2 text-xs uppercase tracking-[0.1em] transition-colors ${
                channel === c.id
                  ? "border-ink bg-ink text-paper"
                  : "border-rule hover:border-ink"
              }`}
            >
              {c.label}
              <span
                className={`ml-2 ${channel === c.id ? "text-paper/50" : "text-ink-faint"}`}
              >
                {c.note}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {channel === "discord" ? (
        <div className="mt-8">
          <p className="max-w-lg text-sm leading-relaxed text-ink-soft">
            Connect your guild&apos;s own Discord server and season
            announcements — nominations opening, the slate reveal, voting,
            the ceremony — post themselves. You&apos;ll need three things from
            Discord: your <strong>Server ID</strong>, an{" "}
            <strong>invite link</strong>, and a <strong>webhook URL</strong>.
            The walkthrough below shows exactly where each one lives.
          </p>
          <div className="mt-6">
            <DiscordGuide />
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <p className="max-w-lg text-sm leading-relaxed text-ink-soft">
            {channel === "text"
              ? "No setup — run the season from the group chat. Each beat below opens as a ready-to-send text; fill in the [brackets] and hit send."
              : "Each beat below opens a pre-written email; fill in the [brackets] and send it to the guild."}
          </p>

          <ul className="mt-6 grid gap-px border border-rule bg-rule">
            {msgs.map((m) => (
              <li key={m.title} className="bg-paper-raised p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="label-eyebrow">{m.title}</h3>
                  <div className="flex gap-2">
                    <a
                      href={
                        channel === "text"
                          ? `sms:?&body=${encodeURIComponent(m.body)}`
                          : `mailto:?subject=${encodeURIComponent(`${guildName || "Couch Cinema Collective"} — ${m.title}`)}&body=${encodeURIComponent(m.body)}`
                      }
                      className="border border-ink px-3.5 py-1.5 text-xs uppercase tracking-[0.1em] transition-colors hover:bg-ink hover:text-paper"
                    >
                      {channel === "text" ? "Open in Messages" : "Open in Mail"}
                    </a>
                    <CopyButton text={m.body} label="Copy" />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {m.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
