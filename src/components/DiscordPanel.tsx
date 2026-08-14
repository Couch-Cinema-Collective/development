"use client";

import { useCallback, useEffect, useState } from "react";

import { DiscordGuide } from "./DiscordGuide";

/**
 * Discord integration (PLAN.md §3.5). Three things are actually possible from a
 * web app, and one commonly-asked-for thing is not:
 *
 *  1. Link out to the guild's own server — trivial, and what most guilds want.
 *  2. Read the public widget.json — live presence and channel list. Rendered
 *     here in our own type rather than Discord's iframe, which fights the brand.
 *  3. Push season events into a channel via webhook — outbound only.
 *
 * Full two-way chat inside this page is not offered by Discord for external
 * sites. It would require a third-party relay (WidgetBot and similar), which
 * proxies your server's messages through their infrastructure.
 */

interface WidgetData {
  name: string;
  instant_invite: string | null;
  channels: { id: string; name: string }[];
  members: { id: string; username: string; status: string }[];
  presence_count?: number;
}

const DEFAULT_SERVER_ID = process.env.NEXT_PUBLIC_DISCORD_SERVER_ID ?? "";
const DEFAULT_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? "";

export function DiscordPanel({
  variant = "full",
}: {
  /** "compact" drops the explanatory footnotes, for use inside the wizard. */
  variant?: "full" | "compact";
}) {
  const [serverId, setServerId] = useState(DEFAULT_SERVER_ID);
  const [invite, setInvite] = useState(DEFAULT_INVITE);
  const [webhook, setWebhook] = useState("");

  const [data, setData] = useState<WidgetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/discord/widget?id=${encodeURIComponent(id)}`);
      const payload = await res.json();
      if (!res.ok) {
        setData(null);
        setError(payload.error ?? "Could not load that server.");
      } else {
        setData(payload as WidgetData);
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEFAULT_SERVER_ID) load(DEFAULT_SERVER_ID);
  }, [load]);

  const online = data?.members ?? [];

  return (
    <section className="border border-ink bg-paper-raised">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule px-6 py-5">
        <h2 className="label-eyebrow">Discord</h2>
        <p className="text-xs text-ink-faint">
          Talk happens on your server. This connects to it.
        </p>
      </header>

      <div className="space-y-6 px-6 py-6">
        {data && (
          <div className="border border-ink">
            <div className="flex flex-wrap items-baseline justify-between gap-3 bg-ink px-5 py-4 text-paper">
              <span className="text-lg uppercase tracking-tight">{data.name}</span>
              <span className="label-eyebrow text-paper/50">
                {online.length} online
              </span>
            </div>

            <div className="grid gap-6 px-5 py-5 sm:grid-cols-2">
              <div>
                <p className="label-eyebrow">Channels</p>
                <ul className="mt-3 space-y-1.5">
                  {data.channels.map((channel) => (
                    <li key={channel.id} className="text-sm text-ink-soft">
                      <span className="text-ink-faint">#</span> {channel.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="label-eyebrow">Here now</p>
                {online.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-faint">Nobody online.</p>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {online.slice(0, 8).map((member) => (
                      <li
                        key={member.id + member.username}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            member.status === "online" ? "bg-signal" : "bg-ink-faint"
                          }`}
                        />
                        {member.username}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-rule px-5 py-4">
              <a
                href={invite || data.instant_invite || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-signal px-5 py-2.5 text-xs uppercase tracking-[0.12em] text-paper transition-colors hover:bg-ink"
              >
                Open the server ↗
              </a>
              <button
                type="button"
                onClick={() => load(serverId)}
                className="border border-rule px-5 py-2.5 text-xs uppercase tracking-[0.12em] transition-colors hover:border-ink"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => setShowRaw((v) => !v)}
                className="border border-rule px-5 py-2.5 text-xs uppercase tracking-[0.12em] transition-colors hover:border-ink"
              >
                {showRaw ? "Hide" : "Show"} Discord&apos;s own widget
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="border border-signal px-5 py-4 text-xs leading-relaxed text-signal">
            {error}
          </p>
        )}

        {showRaw && serverId && (
          <div className="overflow-hidden border border-rule">
            <iframe
              title="Discord server widget"
              src={`https://discord.com/widget?id=${encodeURIComponent(serverId)}&theme=dark`}
              width="100%"
              height="340"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              className="block"
            />
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Server ID"
            value={serverId}
            onChange={setServerId}
            placeholder="81384788765712384"
          />
          <Field
            label="Invite link"
            value={invite}
            onChange={setInvite}
            placeholder="https://discord.gg/…"
          />
          <div className="sm:col-span-2">
            <Field
              label="Webhook URL — season announcements"
              value={webhook}
              onChange={setWebhook}
              placeholder="https://discord.com/api/webhooks/…"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => load(serverId)}
          disabled={!serverId || loading}
          className="border border-ink px-5 py-2.5 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
        >
          {loading ? "Connecting…" : "Connect server"}
        </button>

        <Announcements />

        <DiscordGuide />

        {variant === "full" && (
          <dl className="space-y-3 border-t border-rule pt-5 text-xs leading-relaxed">
            <div>
              <dt className="font-medium">What this reads</dt>
              <dd className="text-ink-faint">
                Discord&apos;s public widget endpoint: server name, channel list,
                and who is online. Available to anyone once the widget is enabled.
              </dd>
            </div>
            <div>
              <dt className="font-medium">What the webhook does</dt>
              <dd className="text-ink-faint">
                Posts season events into the channel you choose: draft opening,
                nominations locking, the slate, voting, and the winners.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Full chat in this page</dt>
              <dd className="text-ink-faint">
                Message history and posting are not exposed to outside sites. That
                would require a third-party relay proxying your server&apos;s
                messages — worth a deliberate decision before it is built.
              </dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}

const EVENTS = [
  { id: "test", label: "Test message" },
  { id: "draft-open", label: "Draft opening" },
  { id: "slate", label: "The slate" },
  { id: "winners", label: "The winners" },
] as const;

/**
 * Fires a real announcement. The webhook itself lives in server config — this
 * only names an event, so the credential never reaches the browser.
 */
function Announcements() {
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const send = async (event: string, label: string) => {
    setSending(event);
    setStatus(null);
    try {
      const res = await fetch("/api/discord/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      const payload = await res.json();
      setStatus(res.ok ? `${label} posted.` : (payload.error ?? "Failed to post."));
    } catch {
      setStatus("Could not reach the server.");
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="border-t border-rule pt-5">
      <p className="label-eyebrow">Announcements</p>
      <p className="mt-2 text-xs leading-relaxed text-ink-faint">
        These post for real, into the channel the webhook points at.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {EVENTS.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => send(event.id, event.label)}
            disabled={sending !== null}
            className="border border-rule px-4 py-2 text-xs uppercase tracking-[0.1em] transition-colors hover:border-ink disabled:opacity-30"
          >
            {sending === event.id ? "Sending…" : event.label}
          </button>
        ))}
      </div>

      {status && <p className="mt-3 text-xs text-signal">{status}</p>}
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
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder={placeholder}
        className="mt-2 w-full border-b border-rule bg-transparent pb-2 font-mono text-sm outline-none placeholder:text-ink-faint focus:border-signal"
      />
    </label>
  );
}
