/**
 * Generate the Apple "client secret" JWT for Sign in with Apple.
 *
 * Supabase's Apple provider does not take the .p8 file — it takes a short-lived
 * ES256 JWT signed *with* that file. Apple caps these at six months, so this
 * has to be re-run and the value re-pasted before it expires or web sign-in
 * silently stops working.
 *
 * Usage:
 *   node scripts/apple-client-secret.mjs \
 *     --team <TEAM_ID> --key-id <KEY_ID> \
 *     --services-id com.couchcinemacollective.web \
 *     --p8 ./AuthKey_XXXXXXXX.p8
 *
 * Paste the output into Supabase → Authentication → Providers → Apple →
 * Secret Key (for OAuth).
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, arg, i, all) => {
    if (arg.startsWith("--")) acc.push([arg.slice(2), all[i + 1]]);
    return acc;
  }, []),
);

for (const required of ["team", "key-id", "services-id", "p8"]) {
  if (!args[required]) {
    console.error(`Missing --${required}`);
    process.exit(1);
  }
}

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const now = Math.floor(Date.now() / 1000);
// Apple rejects anything beyond six months.
const SIX_MONTHS = 60 * 60 * 24 * 180;

const header = { alg: "ES256", kid: args["key-id"] };
const payload = {
  iss: args.team,
  iat: now,
  exp: now + SIX_MONTHS,
  aud: "https://appleid.apple.com",
  sub: args["services-id"],
};

const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

const signer = createSign("SHA256");
signer.update(signingInput);
// Apple wants a raw r||s signature, not the DER encoding Node emits by default.
const signature = signer.sign(
  { key: readFileSync(args.p8, "utf8"), dsaEncoding: "ieee-p1363" },
);

const jwt = `${signingInput}.${signature.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

console.error(`Expires: ${new Date((now + SIX_MONTHS) * 1000).toISOString().slice(0, 10)}`);
console.log(jwt);
