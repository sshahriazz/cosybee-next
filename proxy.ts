import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeRedirect } from "@/app/lib/safe-redirect";
import {
  GATE_COOKIE,
  GATE_KEY_PARAM,
  GATE_PATH,
  gateCookieOptions,
  isCorrectPassword,
  isGateEnabled,
  isSecureRequest,
  issueToken,
  isValidToken,
} from "@/app/lib/sandbox-gate";

/**
 * Optimistic auth gate (Next.js 16 "Proxy", formerly Middleware).
 *
 * Two independent layers run here, in this order:
 *
 *  1. The SANDBOX GATE — a shared-password wall around the whole deployment,
 *     active only where `SANDBOX_ACCESS_PASSWORD` is set and never on the
 *     production host. See `app/lib/sandbox-gate.ts`. Unlike layer 2 this one
 *     IS the security boundary, not an optimistic hint: nothing behind it
 *     renders until the signed cookie verifies.
 *
 *  2. The member auth gate — this only inspects the *presence* of a better-auth
 *     session cookie; it never validates the session or checks roles (that
 *     would mean a network/DB call on every prefetch). Secure identity/role
 *     checks live in the Data Access Layer (`app/lib/server-session.ts`) and
 *     run inside the protected layouts and Server Actions. See the Next.js auth
 *     guide: optimistic here, secure there.
 */

// Areas that require *some* authenticated session.
const protectedPrefixes = ["/admin", "/account", "/set-password"];

// Public auth screens — a logged-in user shouldn't see these.
const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

function hasSessionCookie(request: NextRequest): boolean {
  // In production the cookie is prefixed with `__Secure-`.
  return Boolean(
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
      request.cookies.get("better-auth.session_token")?.value,
  );
}

/**
 * Paths that must keep answering while the deployment is locked.
 *
 *  - the unlock screen itself, or there would be no way in;
 *  - robots.txt, because a crawler that can't read it assumes it may crawl.
 *    Ours says "Disallow: /" on every non-production host (app/robots.ts) and
 *    is the reason sandbox URLs stay out of search — worth more open than shut;
 *  - /.well-known/, used for certificate and domain-ownership challenges, which
 *    are machine-to-machine and cannot type a password.
 *
 * `_next/static` is the fourth exception and lives in the `matcher` below,
 * because the unlock screen needs its own CSS and JS to render.
 */
function isAlwaysOpen(pathname: string): boolean {
  return (
    pathname === GATE_PATH ||
    pathname.startsWith(`${GATE_PATH}/`) ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/.well-known/")
  );
}

/**
 * Layer 1. Returns a response when the request must be stopped or redirected,
 * or `null` to let it carry on to the rest of the proxy.
 */
async function sandboxGate(
  request: NextRequest,
): Promise<NextResponse | null> {
  // Behind Dokploy's Traefik the real hostname arrives forwarded; nextUrl.host
  // is the fallback for a direct hit.
  const host = request.headers.get("x-forwarded-host") ?? request.nextUrl.host;
  if (!isGateEnabled(host)) return null;

  const { pathname, search, searchParams } = request.nextUrl;
  if (isAlwaysOpen(pathname)) return null;

  const secure = isSecureRequest(
    request.headers.get("x-forwarded-proto"),
    request.nextUrl.protocol,
  );

  // Shareable unlock link: <any url>?key=<access code>. Whatever the outcome we
  // redirect to the same URL with the key stripped, so a wrong code can't be
  // told apart from a right one by the response, and a correct one doesn't stay
  // in the address bar to be screenshotted or leaked via Referer.
  if (searchParams.has(GATE_KEY_PARAM)) {
    const clean = new URL(request.url);
    clean.searchParams.delete(GATE_KEY_PARAM);
    const response = NextResponse.redirect(clean);
    if (await isCorrectPassword(searchParams.get(GATE_KEY_PARAM) ?? "")) {
      response.cookies.set(
        GATE_COOKIE,
        await issueToken(),
        gateCookieOptions(secure),
      );
    }
    return response;
  }

  if (await isValidToken(request.cookies.get(GATE_COOKIE)?.value)) return null;

  // Locked. Route handlers get a status they can act on rather than a login
  // page they'd have to parse — this covers fetches from the client too.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "This deployment is private. Unlock it at " + GATE_PATH },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Everything else goes to the unlock screen, carrying where they were headed
  // so unlocking lands them there instead of dumping them on the home page.
  const unlockUrl = new URL(GATE_PATH, request.url);
  if (pathname !== "/") unlockUrl.searchParams.set("from", pathname + search);
  const response = NextResponse.redirect(unlockUrl);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function proxy(request: NextRequest) {
  const locked = await sandboxGate(request);
  if (locked) return locked;

  const { pathname } = request.nextUrl;
  const authed = hasSessionCookie(request);

  // Already signed in → bounce away from login/register/etc.
  if (
    authRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  ) {
    if (authed) {
      // Honour an explicit, on-site ?redirect=; otherwise hand off to
      // /post-login, which routes admins to the dashboard and everyone else
      // home. Never default an authed user to /account.
      const target = safeRedirect(
        request.nextUrl.searchParams.get("redirect"),
        "/post-login",
      );
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // Protected areas → require a session cookie, else send to login with a
  // sanitised return path.
  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (!authed) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

/**
 * The sandbox gate has to see EVERY request — a wall with a list of covered
 * routes is not a wall — so this matches the whole site rather than the handful
 * of auth paths it used to. Layer 2 is unaffected: it tests `pathname` against
 * its own prefixes before doing anything.
 *
 * `_next/static` is the single exclusion: those are the build's own immutable
 * CSS/JS chunks (no page content), they're the assets the unlock screen itself
 * needs, and they're the highest-volume path on the site — no reason to wake a
 * function for each one. Everything else, `/_next/image` and the contents of
 * `public/` included, goes through the gate; some of what sits in `public/` is
 * readable documentation, not just decoration.
 */
export const config = {
  matcher: ["/((?!_next/static).*)"],
};
