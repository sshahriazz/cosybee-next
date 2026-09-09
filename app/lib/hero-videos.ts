// The landscape hero reel shown behind the home and download-app heroes by
// HeroBackgroundVideo.
//
// WHERE IT IS SERVED FROM is a deployment decision, not a code one. Unset, the
// file ships in `public/` and Next serves it from our own origin — fine, but it
// puts ~13MB of media streaming through the same Node process that renders the
// pages, and `proxy.ts` matches everything outside `_next/static`, so each of
// the many HTTP range requests a player makes wakes the middleware too. Point
// NEXT_PUBLIC_HERO_VIDEO_URL at a CDN object and all of that moves off the app
// server and gets served from an edge near the viewer instead.
//
// Moving it is NOT a way to make the page lighter — the browser downloads the
// same bytes either way. That is an encode problem: the current cut is 58s at
// 1.81 Mbps, and a hero backdrop wants a ~12s loop.
//
// Whichever origin serves it, THE FILENAME IS THE CACHE KEY. Local files get
// `immutable` for a year from the /hero-videos rule in next.config.ts, and a
// CDN object should be set up the same way — so ship a new cut under a new
// name rather than overwriting one in place, or clients keep the old footage.
const LOCAL_HERO_VIDEO = "/hero-videos/energiebee_tx_v1_(720p).mp4";

/**
 * Absolute URL of the hero reel, or the local path when no CDN is configured.
 *
 * `NEXT_PUBLIC_*`, so it is inlined at build time and must also be passed as a
 * Docker build arg (see the Dockerfile) — a runtime-only value would not reach
 * the client bundle. It is read in next.config.ts as well, to widen the CSP.
 */
export const HERO_VIDEO_LANDSCAPE =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL?.trim() || LOCAL_HERO_VIDEO;

/**
 * The third-party origin the browser will open a connection to for the reel,
 * or null when it comes from our own origin.
 *
 * Drives the `<link rel="preconnect">` in HeroBackgroundVideo: going off-origin
 * trades an app-server request for a fresh DNS + TCP + TLS handshake, and the
 * hint starts that during the hero's first paint rather than when the video
 * element asks for its first byte.
 *
 * Deliberately not `crossOriginOf` from image-optimization.ts — that one first
 * asks whether `/_next/image` could proxy the URL, which is meaningless here
 * since video never goes through the optimizer.
 */
export const HERO_VIDEO_ORIGIN: string | null = (() => {
  if (!/^https?:\/\//i.test(HERO_VIDEO_LANDSCAPE)) return null;
  try {
    return new URL(HERO_VIDEO_LANDSCAPE).origin;
  } catch {
    // A malformed override should fall back to no hint, not break the build.
    return null;
  }
})();
