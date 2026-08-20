"use client";

import { useState, useTransition } from "react";

import { DiscordGuide } from "./DiscordGuide";
import { CopyButton } from "./CopyButton";
import { saveDiscordSettings } from "@/app/guild/[id]/discord-actions";

type Channel = "discord" | "text" | "email";

/**
 * Discord has no deep link that opens the create-server dialog directly, so
 * this lands people in the app where the + button lives.
 */
const DISCORD_APP_URL = "https://discord.com/channels/@me";

function DiscordSettingsForm({ guildId }: { guildId: string }) {
  const [serverId, setServerId] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nothingEntered = !serverId.trim() && !inviteUrl.trim() && !webhookUrl.trim();

  function save() {
    setStatus(null);
    setError(null);
    startTransition(async () => {
      const result = await saveDiscordSettings(guildId, {
        serverId,
        inviteUrl,
        webhookUrl,
      });
      if (result.error) setError(result.error);
      else setStatus("Saved. Announcements will post to your channel.");
    });
  }

  return (
    <div className="mt-8">
      <p className="max-w-lg text-sm leading-relaxed text-ink-soft">
        Connect your guild&apos;s own Discord server and festival announcements
        — nominations opening, the lineup reveal, each film&apos;s windows, the
        ceremony — post
        themselves. You&apos;ll need three things from Discord: your{" "}
        <strong>Server ID</strong>, an <strong>invite link</strong>, and a{" "}
        <strong>webhook URL</strong>.
      </p>

      <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
        <span>Don&apos;t have a server yet?</span>
        <a
          href={DISCORD_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-ink px-4 py-2 text-xs uppercase tracking-[0.1em] transition-colors hover:bg-ink hover:text-paper"
        >
          Start one on Discord ↗
        </a>
        <span className="text-xs text-ink-faint">
          Opens Discord — hit the <strong>+</strong> in the left rail, then
          &ldquo;Create My Own&rdquo;.
        </span>
      </p>

      <div className="mt-8 grid gap-5 border border-ink bg-paper-raised p-6 sm:grid-cols-2">
        <Field
          label="Server ID"
          value={serverId}
          onChange={setServerId}
          placeholder="1536834147274719342"
        />
        <Field
          label="Invite link"
          value={inviteUrl}
          onChange={setInviteUrl}
          placeholder="https://discord.gg/…"
        />
        <div className="sm:col-span-2">
          <Field
            label="Webhook URL — where announcements post"
            value={webhookUrl}
            onChange={setWebhookUrl}
            placeholder="https://discord.com/api/webhooks/…"
          />
          <p className="mt-2 text-xs text-ink-faint">
            Treat this one like a password — anyone holding it can post to your
            channel. It&apos;s stored server-side and never shown again.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <button
            type="button"
            onClick={save}
            disabled={pending || nothingEntered}
            className="bg-ink px-6 py-3 text-xs uppercase tracking-[0.12em] text-paper transition-colors hover:bg-signal disabled:opacity-30 disabled:hover:bg-ink"
          >
            {pending ? "Saving…" : "Save Discord settings"}
          </button>
          {status && <span className="text-xs text-signal">{status}</span>}
          {error && <span className="text-xs text-signal">{error}</span>}
        </div>
      </div>

      <div className="mt-8">
        <DiscordGuide />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="label-eyebrow block">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full border-b border-rule bg-transparent pb-2 font-mono text-sm outline-none placeholder:text-ink-faint focus:border-signal"
      />
    </label>
  );
}

const CHANNELS: { id: Channel; label: string; note: string }[] = [
  { id: "discord", label: "Discord", note: "Recommended" },
  { id: "text", label: "Text", note: "Group chat" },
  { id: "email", label: "Email", note: "Old faithful" },
];

/**
 * The festival's beats, as ready-to-send messages. Placeholders in [brackets]
 * are the sender's to fill — dates and links the app can't know yet.
 */
function templates(guildName: string, categoryName: string) {
  const guild = guildName || "the guild";
  const category = categoryName || "the festival";
  return [
    {
      title: "Nominations open",
      body: `🎬 ${guild} — the ${category} festival is on. Curators: one film each, and whatever you put up is what we all watch. Get it in by [date]: [link]`,
    },
    {
      title: "Film opening",
      body: `📽️ Film [n] of [n] is open for ${guild}: [title]. Watch it by [date], then you have two days to file 200 characters on it. Miss the window and you miss the round.`,
    },
    {
      title: "Reviews open for voting",
      body: `✍️ Reviews are in for [title] — all anonymous. You have 24 hours to spend your 3 upvotes. Spend all three or your own review drops out: [link]`,
    },
    {
      title: "Awards announcement",
      body: `🏆 The envelopes open [date/time]. ${guild}'s ${category} festival comes down to Best of the Fest — see you at the ceremony: [link]`,
    },
  ];
}

export function CommunicationStep({
  guildId,
  guildName,
  categoryName,
}: {
  guildId: string;
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
        <DiscordSettingsForm guildId={guildId} />
      ) : (
        <div className="mt-8">
          <p className="max-w-lg text-sm leading-relaxed text-ink-soft">
            {channel === "text"
              ? "No setup — run the festival from the group chat. Each beat below opens as a ready-to-send text; fill in the [brackets] and hit send."
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
