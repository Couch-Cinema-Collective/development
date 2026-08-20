/**
 * Send a push through APNs from the command line.
 *
 * Two jobs. With a real device token it delivers a notification. With a fake
 * one it still proves your credentials work — Apple distinguishes a bad token
 * from a bad key, and that difference is the useful signal:
 *
 *   BadDeviceToken      → key, team and bundle are all correct
 *   InvalidProviderToken → the APNs key, key id or team id is wrong
 *   TopicDisallowed     → APNS_BUNDLE_ID doesn't match the key's app
 *
 * Usage:
 *   node scripts/send-test-push.mjs                 # credential check
 *   node scripts/send-test-push.mjs <deviceToken>   # real delivery
 *   node scripts/send-test-push.mjs <token> --prod  # production APNs
 *
 * Reads APNS_* from .env.local.
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import http2 from "node:http2";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_KEY, APNS_KEY_PATH } = process.env;
const missing = ["APNS_KEY_ID", "APNS_TEAM_ID", "APNS_BUNDLE_ID"].filter((k) => !process.env[k]);
if (missing.length || (!APNS_KEY && !APNS_KEY_PATH)) {
  console.error("Missing config:", missing.join(", ") || "APNS_KEY or APNS_KEY_PATH");
  process.exit(1);
}

const args = process.argv.slice(2);
const deviceToken = args.find((a) => !a.startsWith("--")) ?? "0".repeat(64);
const isFake = deviceToken === "0".repeat(64);
const host = args.includes("--prod")
  ? "https://api.push.apple.com"
  : "https://api.sandbox.push.apple.com";

const b64url = (b) =>
  Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const key = APNS_KEY ? APNS_KEY.replace(/\\n/g, "\n") : readFileSync(APNS_KEY_PATH, "utf8");
const now = Math.floor(Date.now() / 1000);
const input =
  `${b64url(JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID }))}.` +
  `${b64url(JSON.stringify({ iss: APNS_TEAM_ID, iat: now }))}`;
const signer = createSign("SHA256");
signer.update(input);
const jwt = `${input}.${b64url(signer.sign({ key, dsaEncoding: "ieee-p1363" }))}`;

console.log(`APNs host : ${host}`);
console.log(`bundle    : ${APNS_BUNDLE_ID}`);
console.log(`token     : ${isFake ? "(fake — credential check only)" : deviceToken.slice(0, 12) + "…"}`);

const client = http2.connect(host);
client.on("error", (e) => { console.error("connection failed:", e.message); process.exit(1); });

const req = client.request({
  ":method": "POST",
  ":path": `/3/device/${deviceToken}`,
  authorization: `bearer ${jwt}`,
  "apns-topic": APNS_BUNDLE_ID,
  "apns-push-type": "alert",
  "apns-priority": "10",
});

let status = 0, body = "";
req.on("response", (h) => (status = Number(h[":status"])));
req.setEncoding("utf8");
req.on("data", (c) => (body += c));
req.on("end", () => {
  client.close();
  const reason = body ? (JSON.parse(body).reason ?? body) : "";
  console.log(`\nHTTP ${status} ${reason}`);
  if (status === 200) console.log("✓ delivered");
  else if (reason === "BadDeviceToken")
    console.log("✓ credentials are valid — only the device token was fake");
  else if (reason === "InvalidProviderToken")
    console.log("✗ APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID are wrong");
  else if (reason === "TopicDisallowed")
    console.log("✗ APNS_BUNDLE_ID does not match the key's app");
  else console.log("✗ unexpected — see Apple's APNs reason codes");
});

req.end(JSON.stringify({
  aps: {
    alert: { title: "Voting is open", body: "One pick per award. Finish the slate to unlock your ballot." },
    sound: "default", badge: 1,
  },
  path: "/vote",
}));
