import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server-side session Data Access Layer (DAL).
 *
 * better-auth runs on an EXTERNAL server (`API_URL`), so this app has no local
 * `auth` instance — server-side session/role checks must ask the auth server
 * directly. This module is the single secure choke point for that: it forwards
 * the incoming request cookies to `${API_URL}/api/auth/get-session` and returns
 * the validated session (including the user's `role`).
 *
 * Per the Next.js auth guidance, `proxy.ts` only does *optimistic* cookie-
 * presence checks; the *secure* role/identity checks happen here and are
 * invoked from protected layouts and every privileged Server Action.
 */

const API_URL = process.env.API_URL || "http://localhost:4000";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  /** Provided by the better-auth admin plugin. */
  role?: string | null;
  banned?: boolean | null;
  /**
   * Set by the auth server when an admin created this account with a password
   * they chose. True means the user must replace it before using the app —
   * see `requireUser` / `requireAdmin` below. Always false/absent for
   * self-service sign-ups and OAuth users.
   */
  mustChangePassword?: boolean | null;
  twoFactorEnabled?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionInfo {
  id: string;
  token?: string;
  userId: string;
  expiresAt: string;
}

export interface ServerSession {
  user: SessionUser;
  session: SessionInfo;
}

/**
 * Validate and return the current session, or `null` when unauthenticated.
 * Memoised with React `cache()` so multiple calls within one render pass
 * (layout + page + actions) hit the auth server only once.
 */
export const getServerSession = cache(async (): Promise<ServerSession | null> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // No cookies at all → definitely no session; skip the network round-trip.
  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ServerSession | null;
    if (!data?.user) return null;
    return data;
  } catch {
    // Auth server unreachable → treat as unauthenticated rather than crash.
    return null;
  }
});

/**
 * Where a user carrying `mustChangePassword` is sent. The page itself checks
 * the session directly rather than through these helpers — otherwise the gate
 * would redirect the very page meant to clear it, in a loop.
 */
const FORCED_PASSWORD_ROUTE = "/set-password";

/** Require any authenticated user. Redirects to login when absent. */
export async function requireUser(redirectTo?: string): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    redirect(
      redirectTo
        ? `/login?redirect=${encodeURIComponent(redirectTo)}`
        : "/login",
    );
  }
  if (session.user.banned) redirect("/banned");
  if (session.user.mustChangePassword) redirect(FORCED_PASSWORD_ROUTE);
  return session;
}

/**
 * Require an admin-role user. Non-admins are sent home; unauthenticated users
 * to login. This is the secure backstop behind the optimistic `proxy.ts` gate.
 */
export async function requireAdmin(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) redirect("/login?redirect=/admin");
  if (session.user.banned) redirect("/banned");
  if (session.user.mustChangePassword) redirect(FORCED_PASSWORD_ROUTE);
  if (session.user.role !== "admin") redirect("/");
  return session;
}

/**
 * Guard for the "create your property" onboarding steps (address search,
 * building-profile). A user who already has a home should not be re-
 * running property creation — the backend rejects a duplicate with
 * `PropertyConflictError` and the UI dead-ends. This gate short-circuits
 * that: non-admins with ≥1 property are sent to the dashboard, admins
 * are allowed through so operators can reproduce the funnel.
 *
 * NOT applied at the layout level because onboarding steps 3 (sunsync)
 * and 4 (octopus) run AFTER the property is created — a blanket gate
 * would boot the user out mid-flow the moment they finish step 2.
 */
export async function requireNoPropertyYet(): Promise<ServerSession> {
  const session = await requireUser("/onboarding/address");
  if (session.user.role === "admin") return session;

  const { listProperties } = await import("./property-state");
  const properties = await listProperties();
  if (properties.length > 0) redirect("/dashboard");
  return session;
}

/**
 * Require an authenticated user who has finished onboarding — the app's
 * standard gate for member-only pages (dashboard, account).
 *
 * "Onboarded" = has at least one non-archived property. Matches the
 * `/post-login` funnel: a signed-in user with zero properties is routed to
 * `/onboarding/address` and cannot reach any tenanted page until they've
 * created a home. The same property-count check is the app's de-facto
 * completion signal — there is no `onboardingCompletedAt` flag on the
 * user record — so archiving every home self-corrects a user back into
 * the funnel on the next request.
 *
 * Admins are EXEMPT: an operator visiting `/dashboard` to reproduce
 * a support ticket must not be trapped in the customer funnel, and the
 * admin surface has its own gate (`requireAdmin`). Any other role is
 * treated as a regular user.
 *
 * Called from user layouts / pages — NOT from `/onboarding/*` itself
 * (that would redirect the very page meant to clear the gate, in a loop).
 */
export async function requireOnboarded(redirectTo?: string): Promise<ServerSession> {
  const session = await requireUser(redirectTo);
  if (session.user.role === "admin") return session;

  // Local import — property-state.ts imports server-only bits, so keeping
  // this inside the function avoids pulling the property fetcher into any
  // page that only needs `requireUser`.
  const { listProperties } = await import("./property-state");
  const properties = await listProperties();
  if (properties.length === 0) redirect("/onboarding/address");
  return session;
}
