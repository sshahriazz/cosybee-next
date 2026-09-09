/**
 * Crawler / bot request logging — detection, client-IP resolution, and the
 * log-line format.
 *
 * This module is pure and side-effect free (nothing here starts logging on
 * import) so it can be reused from anywhere that has a request: the HTTP hook
 * in `crawler-http-logger.ts` is the only caller today, but a Route Handler or
 * `proxy.ts` could call `detectCrawler()` just as easily.
 *
 * A USER-AGENT IS NOT PROOF OF IDENTITY.
 * Everything here classifies a request by the `User-Agent` string it sent, and
 * that string is trivially forged — `curl -A Googlebot https://...` produces a
 * log line indistinguishable from the real thing. Read these logs as "a request
 * claiming to be X", never as "Google fetched this".
 *
 * We deliberately do NOT verify crawlers. Proving a request really is Googlebot
 * means a reverse-then-forward DNS lookup (or a lookup against Google's
 * published IP ranges) on every hit — a network round trip per request on a
 * site that is otherwise served from the static/ISR cache in single-digit
 * milliseconds. That cost buys nothing for the question these logs exist to
 * answer ("is our content being crawled, and which URLs?"). If a *different*
 * question ever comes up — "is someone impersonating Googlebot to scrape us?" —
 * answer it offline against the logged IPs, not inline on the request path.
 */

/** One logged crawler request. Everything else about the request is dropped. */
export type CrawlerHit = {
  /** Crawler name from the table below, e.g. "Googlebot" (claimed, not proven). */
  crawler: string;
  /** HTTP method, e.g. "GET". */
  method: string;
  /** Path + query, e.g. "/hive/my-article?x=1". */
  url: string;
  /** HTTP response status, when the transport can see it. */
  status?: number;
  /** Wall-clock time from request received to response finished. */
  durationMs?: number;
  /** Best-effort client IP — see `resolveClientIp()` for the trust model. */
  ip?: string;
  /** The raw (truncated) User-Agent, so an unknown bot can be identified later. */
  userAgent: string;
  /** Referer header, when the client sent one. */
  referer?: string;
  /** ISO 8601, UTC. */
  timestamp: string;
};

/* -------------------------------------------------------------------------- */
/* Detection                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Known crawlers, ordered MOST SPECIFIC FIRST — the first pattern that matches
 * wins, so `Google-InspectionTool` and `Googlebot-Image` must come before the
 * generic `Googlebot`.
 *
 * To add a crawler: drop one line in the right group. Nothing else to change.
 */
const CRAWLER_SIGNATURES: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  // --- Google ---------------------------------------------------------------
  // Search Console's "URL inspection" / Rich Results test. Seeing this means a
  // human pressed a button in Search Console, so it is worth distinguishing.
  { name: "Google-InspectionTool", pattern: /Google-InspectionTool/i },
  { name: "Googlebot-Image", pattern: /Googlebot-Image/i },
  { name: "Googlebot-Video", pattern: /Googlebot-Video/i },
  { name: "Googlebot-News", pattern: /Googlebot-News/i },
  { name: "Storebot-Google", pattern: /Storebot-Google/i },
  { name: "Google-Read-Aloud", pattern: /Google-Read-Aloud/i },
  { name: "Feedfetcher-Google", pattern: /Feedfetcher-Google/i },
  { name: "AdsBot-Google", pattern: /AdsBot-Google/i },
  { name: "Mediapartners-Google", pattern: /Mediapartners-Google/i },
  { name: "APIs-Google", pattern: /APIs-Google/i },
  { name: "GoogleOther", pattern: /GoogleOther/i },
  { name: "Google-Extended", pattern: /Google-Extended/i },
  { name: "Googlebot", pattern: /Googlebot/i },

  // --- Bing / Microsoft -----------------------------------------------------
  { name: "BingPreview", pattern: /BingPreview/i },
  { name: "adidxbot", pattern: /adidxbot/i },
  { name: "Bingbot", pattern: /bingbot/i },
  { name: "MicrosoftPreview", pattern: /MicrosoftPreview/i },

  // --- Other search engines -------------------------------------------------
  { name: "YandexBot", pattern: /Yandex(?:Bot|Images|Video|Mobile|Webmaster)/i },
  {
    name: "DuckDuckBot",
    pattern: /DuckDuckBot|DuckDuckGo-Favicons-Bot|DuckAssistBot/i,
  },
  { name: "Baiduspider", pattern: /Baiduspider/i },
  { name: "Yahoo-Slurp", pattern: /Slurp/i },
  { name: "Applebot", pattern: /Applebot/i },
  { name: "PetalBot", pattern: /PetalBot/i }, // Huawei Petal Search
  { name: "SeznamBot", pattern: /SeznamBot/i },
  { name: "Sogou", pattern: /Sogou (?:web|inst) spider/i },
  { name: "NaverBot", pattern: /Yeti\/|NaverBot/i },
  { name: "Exabot", pattern: /Exabot/i },

  // --- News aggregators and feed readers ------------------------------------
  // NewsNow's crawler; the UA carries the newsnow.co.uk URL.
  { name: "NewsNow", pattern: /NewsNow/i },
  { name: "Feedly", pattern: /Feedly/i },
  { name: "Inoreader", pattern: /Inoreader/i },
  { name: "NewsBlur", pattern: /NewsBlur/i },
  { name: "Feedbin", pattern: /Feedbin/i },
  { name: "Flipboard", pattern: /FlipboardProxy|Flipboard/i },
  { name: "SmartNews", pattern: /SmartNews/i },
  { name: "NewsBreak", pattern: /NewsBreak/i },

  // --- Social / messaging link unfurlers ------------------------------------
  // These fetch a URL when someone shares it: they are how the OG card gets
  // built, so a missing hit here usually means a broken share preview.
  { name: "Facebook", pattern: /facebookexternalhit|facebookcatalog|Facebot/i },
  {
    name: "Meta-ExternalAgent",
    pattern: /meta-externalagent|meta-externalfetcher/i,
  },
  { name: "Twitterbot", pattern: /Twitterbot/i },
  { name: "LinkedInBot", pattern: /LinkedInBot/i },
  { name: "Slackbot", pattern: /Slackbot|Slack-ImgProxy/i },
  { name: "Discordbot", pattern: /Discordbot/i },
  { name: "TelegramBot", pattern: /TelegramBot/i },
  { name: "WhatsApp", pattern: /WhatsApp/i },
  { name: "Pinterestbot", pattern: /Pinterest(?:bot)?\//i },
  { name: "Redditbot", pattern: /redditbot/i },

  // --- AI / LLM crawlers ----------------------------------------------------
  // Kept in step with the AI_CRAWLERS allow-list in app/robots.ts: we invite
  // these in, so it is worth seeing whether they actually turn up.
  { name: "GPTBot", pattern: /GPTBot/i },
  { name: "OAI-SearchBot", pattern: /OAI-SearchBot/i },
  { name: "ChatGPT-User", pattern: /ChatGPT-User/i },
  {
    name: "ClaudeBot",
    pattern: /ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai/i,
  },
  { name: "PerplexityBot", pattern: /PerplexityBot|Perplexity-User/i },
  { name: "CCBot", pattern: /CCBot/i },
  { name: "Amazonbot", pattern: /Amazonbot/i },
  { name: "Bytespider", pattern: /Bytespider/i },
  { name: "YouBot", pattern: /YouBot/i },
  { name: "Diffbot", pattern: /Diffbot/i },
  { name: "cohere-ai", pattern: /cohere-ai|cohere-training-data-crawler/i },

  // --- SEO / marketing crawlers ---------------------------------------------
  // Not search engines. Useful to spot because they can be a large share of
  // total crawl volume.
  { name: "AhrefsBot", pattern: /AhrefsBot|AhrefsSiteAudit/i },
  { name: "SemrushBot", pattern: /Semrush/i },
  { name: "MJ12bot", pattern: /MJ12bot/i },
  { name: "DotBot", pattern: /DotBot/i },
  { name: "DataForSeoBot", pattern: /DataForSeoBot/i },
  { name: "ScreamingFrog", pattern: /Screaming Frog/i },
  { name: "BLEXBot", pattern: /BLEXBot/i },

  // --- Monitoring / archiving -----------------------------------------------
  { name: "UptimeRobot", pattern: /UptimeRobot/i },
  { name: "Pingdom", pattern: /Pingdom/i },
  { name: "ia_archiver", pattern: /ia_archiver|archive\.org_bot/i },
  { name: "Lighthouse", pattern: /Chrome-Lighthouse/i },
];

/**
 * Catch-all for crawlers not in the table. Deliberately conservative: it looks
 * for a bot-ish token followed by a separator (`Googlebot/2.1`, `SomeSpider;`)
 * or the `+http://...` self-identifying URL that almost every polite crawler
 * carries. It must NOT fire on ordinary browsers — this is what keeps the logs
 * to crawlers instead of all traffic.
 */
const GENERIC_CRAWLER =
  /(?:bot|crawler|spider|scraper|archiver|indexer|fetcher)(?:[^a-z]|$)|\+https?:\/\//i;

/**
 * Substrings that trip GENERIC_CRAWLER but are not crawlers — device names and
 * browser tokens that happen to contain "bot" (CUBOT is an Android phone
 * brand). Add here when a false positive shows up in the logs.
 */
const NOT_CRAWLERS = /cubot/i;

/** Pull the bot's own name out of an unrecognised UA, e.g. "AcmeBot/1.0". */
const GENERIC_CRAWLER_NAME =
  /([A-Za-z][A-Za-z0-9._-]{0,30}(?:bot|crawler|spider|scraper))/i;

/**
 * Return the crawler's name, or `null` for anything that looks like a human's
 * browser. The single place crawler identity is decided — extend
 * CRAWLER_SIGNATURES above rather than adding checks at call sites.
 */
export function detectCrawler(userAgent: string): string | null {
  if (!userAgent) {
    // No UA at all. Real browsers always send one; scripts and scanners often
    // do not. Worth seeing, and it cannot be confused with a named crawler.
    return "No-User-Agent";
  }

  for (const { name, pattern } of CRAWLER_SIGNATURES) {
    if (pattern.test(userAgent)) return name;
  }

  if (NOT_CRAWLERS.test(userAgent)) return null;

  if (GENERIC_CRAWLER.test(userAgent)) {
    const named = GENERIC_CRAWLER_NAME.exec(userAgent);
    return named ? named[1] : "UnknownBot";
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Which requests are worth a log line                                        */
/* -------------------------------------------------------------------------- */

/**
 * SEO-critical paths that are ALWAYS logged, even if a rule below would drop
 * them. These are the files whose crawl behaviour we actually want to watch.
 */
const ALWAYS_LOG = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/video-sitemap.xml",
  "/news-sitemap.xml",
  "/rss.xml",
  "/newsnow/newsnow.xml",
  "/news/applenews.xml",
  "/smartnews/smartnews.xml",
  "/newsbreak/newsbreak.xml",
  "/llms.txt",
  "/manifest.webmanifest",
]);

/** Framework internals and dev-only endpoints — never interesting. */
const SKIPPED_PREFIXES = [
  "/_next/", // static chunks, /_next/image, RSC payloads
  "/__nextjs", // dev overlay / stack-frame endpoints
];

/**
 * Static asset extensions dropped to keep the signal-to-noise high. Note what
 * is NOT here on purpose: `.xml`, `.txt`, `.json` and `.pdf` stay logged,
 * because that is where the sitemaps, feeds and robots.txt live. Delete an
 * entry from this set if you ever want image crawl hits (Googlebot-Image) too.
 */
const SKIPPED_EXTENSIONS = new Set([
  "js", "mjs", "css", "map",
  "png", "jpg", "jpeg", "gif", "svg", "webp", "avif", "ico", "bmp",
  "woff", "woff2", "ttf", "otf", "eot",
  "mp4", "webm", "mov", "m4v", "mp3",
]);

/**
 * True when a crawler hit on this path is worth a log line. Keeps the volume
 * proportional to what is being asked ("which pages are crawled?") instead of
 * one line per asset on the page.
 */
export function shouldLogPath(pathname: string): boolean {
  if (ALWAYS_LOG.has(pathname)) return true;
  if (pathname === "/favicon.ico") return false;
  if (SKIPPED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  const dot = lastSegment.lastIndexOf(".");
  if (dot > 0) {
    if (SKIPPED_EXTENSIONS.has(lastSegment.slice(dot + 1).toLowerCase())) {
      return false;
    }
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* Client IP                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * How many reverse proxies sit in front of this app. In production that is
 * Dokploy's Traefik (1). Put a CDN in front and it becomes 2 — set
 * TRUSTED_PROXY_HOPS on the deployment rather than editing this file.
 *
 * Locally it is 0: nothing is in front of `next dev`, so an `X-Forwarded-For`
 * on an inbound request can only have been made up by the client, and is
 * ignored.
 */
export const TRUSTED_PROXY_HOPS = Number.parseInt(
  process.env.TRUSTED_PROXY_HOPS ??
    (process.env.NODE_ENV === "production" ? "1" : "0"),
  10,
);

/** `::ffff:1.2.3.4` -> `1.2.3.4`; leaves real IPv6 alone. */
function normalizeIp(ip: string | undefined): string | undefined {
  const trimmed = ip?.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
}

/**
 * Resolve the client IP without blindly trusting client-supplied headers.
 *
 * `X-Forwarded-For` is a chain that each proxy APPENDS to, so the entries a
 * client can forge are on the LEFT and the ones our own infrastructure wrote
 * are on the RIGHT. With one trusted hop, the right-most entry is the address
 * Traefik actually saw — take that, not `split(",")[0]`, which is whatever the
 * caller decided to write. With zero trusted hops (local dev, or an app exposed
 * directly to the internet) the headers are ignored entirely and only the
 * socket address is used.
 */
export function resolveClientIp(
  forwardedFor: string | undefined,
  realIp: string | undefined,
  socketAddress: string | undefined,
): string | undefined {
  if (TRUSTED_PROXY_HOPS <= 0) return normalizeIp(socketAddress);

  const chain = (forwardedFor ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (chain.length > 0) {
    // Right-most minus the hops we trust; clamped so a shorter-than-expected
    // chain degrades to the left-most entry rather than going out of bounds.
    return normalizeIp(chain[Math.max(0, chain.length - TRUSTED_PROXY_HOPS)]);
  }

  // Nginx-style single-value header; overwritten by the proxy on each hop.
  return normalizeIp(realIp) ?? normalizeIp(socketAddress);
}

/* -------------------------------------------------------------------------- */
/* Output                                                                     */
/* -------------------------------------------------------------------------- */

/** Ops kill-switch: `CRAWLER_LOG=off` in the environment silences this. */
export const CRAWLER_LOG_ENABLED = process.env.CRAWLER_LOG !== "off";

/**
 * Strip control characters and cap the length. A forged User-Agent or Referer
 * must not be able to inject newlines and so forge extra log lines.
 */
function sanitize(value: string, maxLength: number): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, maxLength);
}

/**
 * One request -> exactly ONE line, because production log search is line-based:
 * a human-readable prefix for `grep`, then the same facts as JSON for `jq`.
 *
 *   [CRAWLER] Googlebot GET /hive/my-article 200 12ms {"crawler":"Googlebot",...}
 */
export function formatCrawlerHit(hit: CrawlerHit): string {
  const status = hit.status ?? "-";
  const duration = hit.durationMs === undefined ? "-" : `${hit.durationMs}ms`;
  return `[CRAWLER] ${hit.crawler} ${hit.method} ${hit.url} ${status} ${duration} ${JSON.stringify(hit)}`;
}

/**
 * Write the log line to stdout, where Docker/Dokploy collects it.
 *
 * NOT `console.log`: `next.config.ts` sets `compiler.removeConsole` for
 * production builds, which strips every `console.*` call except `error` — a
 * `console.log` here would work in dev and silently vanish in production, which
 * is the one environment these logs exist for. `process.stdout.write` is not
 * touched by that transform, and guarantees a single line (Node's console
 * pretty-prints objects across several lines, which breaks per-line grep).
 */
export function logCrawlerHit(hit: CrawlerHit): void {
  if (!CRAWLER_LOG_ENABLED) return;
  process.stdout.write(
    `${formatCrawlerHit({
      ...hit,
      method: sanitize(hit.method, 16),
      url: sanitize(hit.url, 512),
      userAgent: sanitize(hit.userAgent, 300),
      referer: hit.referer ? sanitize(hit.referer, 300) : undefined,
    })}\n`,
  );
}
