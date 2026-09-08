/**
 * Sandbox access gate — a shared-password wall in front of NON-production
 * deployments, so work in progress isn't readable by whoever finds the URL.
 *
 * This is deliberately NOT the site's own auth. better-auth (see
 * `server-session.ts`) answers "which member is this?"; the gate answers the
 * cruder question "may this browser see the deployment at all?". They stack:
 * the gate wraps everything, including /login and /admin, and once past it the
 * normal session rules apply unchanged. Keeping them separate means the shared
 * code can be handed to a client for a look around without minting an account,
 * and production never runs a line of this.
 *
 * HOW IT'S TURNED ON
 * Set `SANDBOX_ACCESS_PASSWORD` in the deployment environment (Dokploy). Unset
 * or empty — which is how production and a developer's machine are configured —
 * and the gate does not exist: `isGateEnabled()` is false and `proxy.ts` skips
 * it entirely.
 *
 * WHY IT ALSO CHECKS THE HOST
 * A password accidentally set on the production environment would put the
 * public site behind a login, silently. So the canonical host refuses to be
 * gated regardless of the env var. If a pre-launch lock on production is ever
 * wanted, delete the host check in `isGateEnabled()` — it is the only thing
 * standing in the way, and it should be a deliberate edit.
 *
 * THE COOKIE
 * Stateless: `<expiry>.<hmac>`, signed with the password and the optional
 * `SANDBOX_SESSION_SECRET`. There is no session store — the signature is the
 * proof, and the expiry sits inside the signed payload so it can't be edited.
 * Because the password is part of the signing key, rotating the password
 * invalidates every cookie already issued, which is the behaviour you want when
 * the code has leaked: change it, redeploy, everyone re-enters it.
 */

import { PRODUCTION_URL } from "./site";

/** The shared access code. Empty/unset = no gate anywhere. */
const PASSWORD = process.env.SANDBOX_ACCESS_PASSWORD?.trim() ?? "";

/**
 * Optional extra signing salt. Rotating it alone logs everyone out while
 * leaving the code they know still valid — useful if a laptop goes missing.
 * Unset is fine: the password alone then keys the signature.
 */
const SECRET = process.env.SANDBOX_SESSION_SECRET?.trim() ?? "";

/** Name of the cookie holding the signed pass. */
export const GATE_COOKIE = "eb_preview";

/** The unlock screen. Always reachable while the gate is up. */
export const GATE_PATH = "/preview";

/**
 * Query parameter that unlocks in one click: any URL + `?eb_preview=<password>`.
 * Lets a link be pasted into a message ("here's the build") without walking
 * someone through a form. `proxy.ts` swaps it for the cookie and redirects to
 * the clean URL, so the code doesn't linger in the address bar — or in the
 * Referer header of the next request.
 *
 * Named after the cookie, and NOT the obvious `key`, because the proxy strips
 * this parameter from every request it sees — including ones already past the
 * gate. A generic name would quietly eat somebody else's: `key` alone is the
 * S3 object in `/api/storage/download?key=…` (app/lib/storage.ts) and the AFD
 * address handle in `/onboarding/building-profile?key=…`. Any new parameter
 * this file reaches for has to be namespaced for the same reason.
 */
export const GATE_KEY_PARAM = "eb_preview";

/** How long a successful unlock lasts, in seconds (30 days). */
export const GATE_MAX_AGE = 60 * 60 * 24 * 30;

const PRODUCTION_HOSTNAME = PRODUCTION_URL.replace(/^https?:\/\//, "");

/** Signing key. Both halves matter — see the cookie note in the file header. */
const SIGNING_KEY = `${SECRET} ${PASSWORD}`;

const encoder = new TextEncoder();

/**
 * Is the gate active for a request arriving at `host`?
 *
 * Host, not a build-time flag: the value is read per request, so one image
 * behaves correctly wherever it runs, and the gate can be exercised locally by
 * setting the password in `.env`. Pass the forwarded host when behind a proxy —
 * Traefik/Dokploy terminate TLS and set `x-forwarded-host`.
 */
export function isGateEnabled(host: string | null | undefined): boolean {
  if (!PASSWORD) return false;
  // Strip any :port and normalise before comparing.
  const hostname = (host ?? "").split(":")[0].trim().toLowerCase();
  if (
    hostname === PRODUCTION_HOSTNAME ||
    hostname === `www.${PRODUCTION_HOSTNAME}`
  ) {
    return false;
  }
  return true;
}

/** base64url, so a digest is safe to carry as a cookie value. */
function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SIGNING_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );
  return base64url(new Uint8Array(signature));
}

/**
 * Constant-time string comparison. Both arguments are always HMAC digests of
 * the same length, so the early length exit leaks nothing; the loop is what
 * keeps a wrong guess from being distinguishable by how fast it was rejected.
 */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Does `candidate` match the configured access code? */
export async function isCorrectPassword(candidate: string): Promise<boolean> {
  if (!PASSWORD || !candidate) return false;
  // Compare digests rather than the raw strings: equal length either way, so
  // neither the code's length nor its leading characters can be timed out of us.
  const [expected, given] = await Promise.all([
    sign(`password:${PASSWORD}`),
    sign(`password:${candidate}`),
  ]);
  return equals(expected, given);
}

/** Mint a pass valid for GATE_MAX_AGE. */
export async function issueToken(now: number = Date.now()): Promise<string> {
  const expiresAt = Math.floor(now / 1000) + GATE_MAX_AGE;
  return `${expiresAt}.${await sign(`pass:${expiresAt}`)}`;
}

/** Is this cookie value one we issued, and still in date? */
export async function isValidToken(
  token: string | null | undefined,
): Promise<boolean> {
  if (!token) return false;
  const separator = token.indexOf(".");
  if (separator < 1) return false;

  const expiresAt = Number(token.slice(0, separator));
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000) {
    return false;
  }

  return equals(await sign(`pass:${expiresAt}`), token.slice(separator + 1));
}

/**
 * Was this request served over TLS? Read from `x-forwarded-proto` first, since
 * Traefik terminates TLS and the app itself only ever sees plain http; the URL
 * protocol is the fallback for a direct hit (local dev). A comma-separated
 * value means several proxies appended to it — the first entry is the client's.
 */
export function isSecureRequest(
  forwardedProto: string | null | undefined,
  urlProtocol?: string,
): boolean {
  const forwarded = (forwardedProto ?? "").split(",")[0].trim().toLowerCase();
  if (forwarded) return forwarded === "https";
  return (urlProtocol ?? "").toLowerCase().startsWith("https");
}

/**
 * Cookie attributes for the pass. `secure` is passed in rather than derived,
 * because only the caller can see the forwarded protocol — and getting it
 * wrong in the strict direction (Secure on plain http) would make the browser
 * drop the cookie and loop the visitor back to the unlock screen forever.
 */
export function gateCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: GATE_MAX_AGE,
  };
}
