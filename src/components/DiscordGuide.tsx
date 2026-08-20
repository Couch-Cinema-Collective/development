/**
 * Setup instructions for the things a president has to do inside Discord
 * itself. Always visible — this used to hide behind a disclosure and people
 * simply didn't find it.
 *
 * Both settings pages need Manage Server permission, which is the most common
 * reason this fails for someone.
 */

const WIDGET_STEPS = [
  "In Discord, click your server name at the top of the channel list, then Server Settings.",
  "In the left sidebar, scroll to the Engagement section and choose Widget. Discord moved this — it is no longer a top-level item.",
  "Switch Enable Server Widget on. The embed stays blank until you do, even with a correct Server ID.",
  "Pick an Invite Channel — this is where the invite button drops people.",
  "Copy the Server ID and the invite link shown on that page.",
];

/** Fallback when the Widget page can't be found — gets the ID a different way. */
const SERVER_ID_STEPS = [
  "User Settings (the cog by your name) → Advanced.",
  "Switch Developer Mode on.",
  "Right-click your server's icon in the far-left rail → Copy Server ID.",
  "You still need the widget enabled for the embed to render.",
];

const WEBHOOK_STEPS = [
  "Server Settings → Integrations → Webhooks.",
  "Click New Webhook and choose the channel announcements should land in.",
  "Name it Couch Cinema Collective so it's obvious in the channel.",
  "Click Copy Webhook URL.",
];

export function DiscordGuide() {
  return (
    <div className="border-t border-rule pt-6">
      <h3 className="label-eyebrow">How to set this up</h3>

      <div className="mt-5 grid gap-8 sm:grid-cols-3">
        <Steps
          title="Enable the widget"
          note="Gets you the Server ID and invite link."
          steps={WIDGET_STEPS}
        />
        <Steps
          title="Add the webhook"
          note="Lets the app post festival events into a channel."
          steps={WEBHOOK_STEPS}
        />
        <Steps
          title="Can't find Widget?"
          note="Another route to the Server ID."
          steps={SERVER_ID_STEPS}
        />
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ink-faint">
        Both settings pages need server owner or <em>Manage Server</em>. If the
        Engagement section isn&apos;t there at all, that permission is what&apos;s
        missing — ask whoever runs the server.
      </p>
    </div>
  );
}

function Steps({
  title,
  note,
  steps,
}: {
  title: string;
  note: string;
  steps: string[];
}) {
  return (
    <div>
      <h4 className="text-sm font-medium uppercase tracking-tight">{title}</h4>
      <p className="mt-1 text-xs text-ink-faint">{note}</p>

      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-xs leading-relaxed">
            <span className="mt-px shrink-0 tabular-nums text-signal">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-ink-soft">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
