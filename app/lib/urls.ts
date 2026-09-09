/**
 * URL rewriting shared by the feeds — pure string work, no server imports.
 *
 * Kept apart from `article-body.ts` on purpose. That module reaches the
 * BlockNote server renderer and is therefore `server-only` by transitivity, and
 * `rss-feed.ts` needs `stripTrackingParams` for every item's link. Importing
 * the render module from the document builder would make the builder
 * server-only too — which is true today and invisible, right up until someone
 * renders a feed link from a client component and gets an error about a module
 * they never mentioned.
 */

import { SITE_URL } from "./site";

/**
 * Query parameters stripped from every URL in a syndicated feed.
 *
 * `utm_*` is the explicit ask from SmartNews — a campaign tag describing how
 * someone arrived at OUR site is meaningless, and actively misleading, once the
 * link is being handed to an aggregator whose readers arrive a different way.
 * The three click identifiers alongside it are the same thing under other
 * names, and none of them is functional: removing one never changes what the
 * URL resolves to.
 *
 * What is deliberately NOT here: `ref_src` and `ref_url`, which look like
 * tracking but are what Twitter/X embeds need to render, and `igshid`, which
 * Instagram puts on its own permalinks. Stripping a parameter an embed depends
 * on trades a tidy URL for a broken embed.
 */
const TRACKING_PARAMS = [/^utm_/i, /^gclid$/i, /^fbclid$/i, /^msclkid$/i];

function isTracking(name: string): boolean {
  return TRACKING_PARAMS.some((p) => p.test(name));
}

/**
 * Remove tracking parameters from one URL, or return it untouched if it cannot
 * be parsed or carries none.
 *
 * Rebuilding the string is avoided unless something was actually removed:
 * `URL` normalises as it serialises (default ports, percent-encoding, a bare
 * host gaining a trailing slash), and a feed full of URLs that differ
 * cosmetically from the canonical ones is a worse outcome than a stray
 * parameter.
 */
export function stripTrackingParams(raw: string): string {
  if (!raw.includes("?")) return raw;
  let u: URL;
  try {
    // Parsed WITHOUT a base, deliberately. `new URL(x, SITE_URL)` resolves
    // almost any string — including malformed ones — into a site-relative URL,
    // so the "give up and return it unchanged" branch below would be
    // unreachable and a malformed input would come back silently rewritten
    // against our own origin. Every caller either holds an absolute URL
    // already or resolves one first (see `toAbsoluteUrl`).
    u = new URL(raw);
  } catch {
    return raw;
  }
  const names = [...u.searchParams.keys()].filter(isTracking);
  if (names.length === 0) return raw;
  for (const name of names) u.searchParams.delete(name);
  // `?` with nothing after it is noise; `URL` keeps it otherwise.
  if (![...u.searchParams.keys()].length) u.search = "";
  return u.toString();
}

/**
 * Resolve `raw` to an absolute URL, or fall back to `fallback`.
 *
 * A feed link has to be absolute — a reader is on someone else's origin — and
 * `canonicalUrl` is a free-text admin field that may hold a site-relative path,
 * a full URL, or a typo. A typo resolves to `fallback` rather than to a
 * plausible-looking URL on our own domain that leads nowhere.
 */
export function toAbsoluteUrl(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  // Shape-check BEFORE parsing. With a base, `new URL` resolves nearly any
  // string rather than throwing — `h ttp://!!` becomes
  // `https://energiebee.com/h%20ttp://!!` — so relying on the catch below alone
  // would turn a typo into a confident-looking URL on our own domain that leads
  // nowhere. A canonical is either an absolute http(s) URL or a root-relative
  // path; anything else is a mistake, and the article's own address is a better
  // answer than a guess.
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) {
    return fallback;
  }
  try {
    return new URL(trimmed, SITE_URL).toString();
  } catch {
    return fallback;
  }
}

/**
 * Strip tracking parameters from every URL in a block of HTML.
 *
 * Matches bare `http(s)` URLs wherever they appear rather than walking specific
 * attributes, because they turn up in more than `href`/`src` — Instagram's
 * embeds carry one in `data-instgrm-permalink`, and authored text sometimes
 * contains a plain link. The terminator set excludes quotes and angle brackets,
 * so a match stops at the end of an attribute value or a tag.
 *
 * `&amp;` MUST be decoded before parsing. A URL written in HTML separates its
 * parameters with `&amp;`, so parsing the raw text sees ONE parameter whose
 * name begins `amp;` — which both hides every parameter after the first from
 * the filter and, on re-serialising, percent-encodes the semicolon and corrupts
 * the URL. Instagram's embed permalinks are the live example
 * (`?utm_source=ig_embed&amp;utm_campaign=loading`).
 *
 * The original text is returned untouched when nothing was stripped, so a URL
 * that needed no cleaning keeps its exact original encoding.
 */
export function stripTrackingParamsInHtml(html: string): string {
  return html.replace(/https?:\/\/[^\s"'<>]+/gi, (raw) => {
    const decoded = raw.replace(/&amp;/gi, "&");
    const cleaned = stripTrackingParams(decoded);
    if (cleaned === decoded) return raw;
    // Back into HTML, where a bare `&` in an attribute value is invalid.
    return cleaned.replace(/&/g, "&amp;");
  });
}

/** Attributes whose value is a URL that a syndicated copy has to resolve. */
const URL_ATTRIBUTES = ["src", "href", "poster"] as const;

/**
 * Rewrite root-relative URLs in `html` to absolute ones.
 *
 * A syndicated body is rendered on someone else's origin, where `/hive/x` and
 * `/uploads/y.png` resolve against THEIR host — a broken link and a missing
 * image. Authored content is almost entirely absolute already (media lives on
 * S3), so this is a safety net rather than a hot path, but it is the difference
 * between a body that renders away from the site and one that half-renders.
 *
 * Only root-relative values (`/…`) are touched. Protocol-relative (`//host/…`),
 * absolute, `#fragment`, `mailto:` and `data:` URLs are all left exactly as
 * they are — the `(?!/)` is what keeps `//cdn.example/x` from being mangled
 * into the site's own origin.
 */
export function absolutizeHtml(html: string): string {
  return URL_ATTRIBUTES.reduce(
    (acc, attr) =>
      acc.replace(
        new RegExp(`(\\s${attr}=")(/(?!/)[^"]*)(")`, "gi"),
        (_m, before, path, after) => `${before}${SITE_URL}${path}${after}`,
      ),
    html,
  );
}
