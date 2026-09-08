"use server";

/**
 * The one way in through the sandbox gate: check the shared code, mint the
 * signed cookie, and send the visitor on to wherever they were headed.
 *
 * Everything security-relevant is re-checked here rather than trusted from the
 * page that rendered the form — a Server Action is a public POST endpoint, so
 * it has to hold up on its own. See `app/lib/sandbox-gate.ts`.
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeRedirect } from "@/app/lib/safe-redirect";
import {
  GATE_COOKIE,
  gateCookieOptions,
  isCorrectPassword,
  isGateEnabled,
  isSecureRequest,
  issueToken,
} from "@/app/lib/sandbox-gate";

export type UnlockState = { error?: string };

/**
 * Brute-force brake. The code is short and shared, so an unthrottled form is a
 * dictionary attack waiting to happen — a few thousand guesses a minute is
 * nothing over HTTP.
 *
 * Deliberately in-memory and per-process: the sandbox runs as a single
 * container, and a gate for a handful of colleagues does not need Redis. It
 * resets on deploy, which is an acceptable trade for having no infrastructure.
 * If this ever moves somewhere horizontally scaled, this is the piece to
 * replace — the attacker would otherwise get MAX_ATTEMPTS per instance.
 */
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;
const failures = new Map<string, { count: number; expiresAt: number }>();

function tooManyAttempts(ip: string): boolean {
  const record = failures.get(ip);
  if (!record) return false;
  if (record.expiresAt <= Date.now()) {
    failures.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  // Sweep expired entries while we're here, so a long run of attempts from
  // rotating addresses can't grow the map without bound.
  const now = Date.now();
  for (const [key, record] of failures) {
    if (record.expiresAt <= now) failures.delete(key);
  }

  const record = failures.get(ip);
  if (record && record.expiresAt > now) {
    record.count += 1;
    return;
  }
  failures.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
}

export async function unlockSandbox(
  _previous: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  // No gate here (production, or no code configured) → nothing to unlock, and
  // no cookie worth minting.
  if (!isGateEnabled(host)) redirect("/");

  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooManyAttempts(ip)) {
    return { error: "Too many attempts. Wait a minute, then try again." };
  }

  if (!(await isCorrectPassword(String(formData.get("password") ?? "")))) {
    recordFailure(ip);
    return { error: "That access code isn't right." };
  }

  failures.delete(ip);

  const cookieStore = await cookies();
  cookieStore.set(
    GATE_COOKIE,
    await issueToken(),
    gateCookieOptions(
      isSecureRequest(requestHeaders.get("x-forwarded-proto")),
    ),
  );

  // `from` is attacker-controllable (it rides in on the query string), so it
  // goes through the same open-redirect sanitiser as the login flow.
  redirect(safeRedirect(String(formData.get("from") ?? ""), "/"));
}
