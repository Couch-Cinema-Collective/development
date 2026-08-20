import "server-only";

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import http2 from "node:http2";

/**
 * Apple Push Notification service.
 *
 * Season deadlines are the reason this app is worth having on a phone — and
 * native capability like this is also what keeps the iOS build the right side
 * of App Store guideline 4.2.
 *
 * No SDK: APNs is an HTTP/2 endpoint with a bearer token, and Node ships both.
 *
 * Config (all server-side):
 *   APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID
 *   APNS_KEY        — the .p8 contents (preferred; works on Vercel)
 *   APNS_KEY_PATH   — or a path to the file, for local development
 *   APNS_ENVIRONMENT — "sandbox" for simulator/TestFlight builds
 */

const HOSTS = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
} as const;

export function pushConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID &&
      process.env.APNS_TEAM_ID &&
      process.env.APNS_BUNDLE_ID &&
      (process.env.APNS_KEY || process.env.APNS_KEY_PATH),
  );
}

function privateKey(): string {
  if (process.env.APNS_KEY) {
    // Env vars can't hold real newlines; accept the escaped form.
    return process.env.APNS_KEY.replace(/\\n/g, "\n");
  }
  return readFileSync(process.env.APNS_KEY_PATH as string, "utf8");
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * APNs tokens are valid for an hour and Apple rejects clients that mint one per
 * request, so this is cached and refreshed just under the limit.
 */
let cached: { token: string; madeAt: number } | null = null;

function bearerToken(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cached && now - cached.madeAt < 50 * 60) return cached.token;

  const header = { alg: "ES256", kid: process.env.APNS_KEY_ID };
  const payload = { iss: process.env.APNS_TEAM_ID, iat: now };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

  const signer = createSign("SHA256");
  signer.update(input);
  // Apple wants raw r||s, not Node's default DER encoding.
  const sig = signer.sign({ key: privateKey(), dsaEncoding: "ieee-p1363" });

  const token = `${input}.${b64url(sig)}`;
  cached = { token, madeAt: now };
  return token;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Deep path opened on tap, e.g. "/draft". */
  path?: string;
}

export interface PushOutcome {
  token: string;
  ok: boolean;
  status?: number;
  /** Apple's reason string — "BadDeviceToken" and friends. */
  reason?: string;
}

/**
 * Deliver to one device. Returns rather than throws: a dead token is an
 * expected outcome, not an error, and the caller prunes on the reason.
 */
function sendOne(
  deviceToken: string,
  message: PushMessage,
  environment: keyof typeof HOSTS,
): Promise<PushOutcome> {
  return new Promise((resolve) => {
    const client = http2.connect(HOSTS[environment]);
    client.on("error", () =>
      resolve({ token: deviceToken, ok: false, reason: "ConnectionFailed" }),
    );

    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${bearerToken()}`,
      "apns-topic": process.env.APNS_BUNDLE_ID as string,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });

    let status = 0;
    let body = "";
    request.on("response", (headers) => {
      status = Number(headers[":status"]);
    });
    request.setEncoding("utf8");
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      client.close();
      let reason: string | undefined;
      try {
        reason = body ? (JSON.parse(body).reason as string) : undefined;
      } catch {
        reason = body || undefined;
      }
      resolve({ token: deviceToken, ok: status === 200, status, reason });
    });

    request.end(
      JSON.stringify({
        aps: {
          alert: { title: message.title, body: message.body },
          sound: "default",
          badge: 1,
        },
        path: message.path ?? "/",
      }),
    );
  });
}

/** Fan out to many devices. Never throws — inspect the outcomes. */
export async function sendPush(
  tokens: { token: string; environment: string }[],
  message: PushMessage,
): Promise<PushOutcome[]> {
  if (!pushConfigured() || tokens.length === 0) return [];

  return Promise.all(
    tokens.map((t) =>
      sendOne(t.token, message, (t.environment === "sandbox" ? "sandbox" : "production")),
    ),
  );
}

/** Tokens Apple says are dead — safe to delete. */
export function isDeadToken(outcome: PushOutcome): boolean {
  return (
    outcome.status === 410 ||
    outcome.reason === "BadDeviceToken" ||
    outcome.reason === "Unregistered"
  );
}
