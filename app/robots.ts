import type { MetadataRoute } from "next";
import { IS_PRODUCTION, SITE_URL } from "./lib/site";

/**
 * Known AI / LLM crawlers. We explicitly ALLOW them so EnergieBee content
 * stays eligible to be cited in AI answer engines (ChatGPT, Perplexity,
 * Google AI Overviews, etc.) — a deliberate visibility choice for a
 * marketing/content site. To restrict any of them later, give it its own
 * rule with `disallow: "/"`.
 */
const AI_CRAWLERS = [
  "GPTBot", // OpenAI (training)
  "OAI-SearchBot", // OpenAI (ChatGPT search)
  "ChatGPT-User", // OpenAI (user-initiated browsing)
  "ClaudeBot", // Anthropic
  "Claude-User", // Anthropic (user-initiated)
  "anthropic-ai", // Anthropic (legacy)
  "PerplexityBot", // Perplexity
  "Perplexity-User", // Perplexity (user-initiated)
  "Google-Extended", // Google Gemini / Vertex training
  "Applebot-Extended", // Apple Intelligence
  "CCBot", // Common Crawl (feeds many LLMs)
  "Bytespider", // ByteDance
  "Amazonbot", // Amazon
  "Meta-ExternalAgent", // Meta AI
];

/**
 * Generates /robots.txt at build time, with a different policy per environment.
 *
 * On PRODUCTION: allows all crawlers — including the AI crawlers above —
 * everywhere except internal Next.js paths, the admin panel, and the member
 * account section, and points at the sitemaps. The admin and account routes are
 * also marked noindex via metadata and an X-Robots-Tag header (see their
 * layouts and next.config.ts).
 *
 * On every OTHER host (sandbox, previews): nothing may be crawled at all.
 */
export default function robots(): MetadataRoute.Robots {
  // Non-production hosts (sandbox, previews) are closed to every crawler. The
  // sitemap is omitted too, so we never advertise the URL list.
  //
  // ONE CAVEAT, for whoever revisits this: robots.txt governs crawling, not
  // indexing. A URL that is already in the index, or that anyone links to from
  // outside, can still appear as a URL-only result — and because this Disallow
  // stops crawlers fetching the page, they never see the site-wide
  // `X-Robots-Tag: noindex` header (next.config.ts) that would remove it. So
  // this rule PREVENTS indexing but cannot UNDO it.
  //
  // If sandbox URLs ever do show up in search, the fix is to temporarily swap
  // this Disallow for `allow: "/"`, let the engines re-crawl and act on the
  // noindex header, then put the Disallow back once they have dropped out.
  // The meta tag (app/layout.tsx) and the header stay in place regardless: they
  // cost nothing and are the safety net if this file is ever relaxed.
  if (!IS_PRODUCTION) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const disallow = ["/api/", "/admin", "/account"];
  // `/api/` is closed, but the social/rich-result card images live under it
  // (`/api/og` and `/api/og/article/*` — see lib/seo.ts, lib/structured-data.ts
  // and the article pages). Crawlers that honour robots.txt — Facebook's
  // scraper among them — would otherwise refuse to fetch the image and fall
  // back to a preview with no card. The longer, more specific rule wins over
  // the `/api/` disallow for Google and Bing regardless of line order.
  const allow = ["/", "/api/og"];
  return {
    rules: [
      {
        userAgent: "*",
        allow,
        disallow,
      },
      // Explicit (redundant-but-intentional) allow for AI crawlers, so the
      // policy is documented and obvious rather than relying on the wildcard.
      {
        userAgent: AI_CRAWLERS,
        allow,
        disallow,
      },
    ],
    // All three files are advertised. The video and news sitemaps are separate
    // documents because Google reads the `video:` and `news:` namespaces only
    // from a sitemap that declares them, and Next's sitemap route has no
    // vocabulary for either. `/sitemap.xml` stays the complete URL list; the
    // news file is just the last two days of articles (see lib/news-sitemap.ts),
    // so it is additional discovery, never a replacement.
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/video-sitemap.xml`,
      `${SITE_URL}/news-sitemap.xml`,
    ],
    // The Host directive expects a bare domain, not a full URL.
    host: SITE_URL.replace(/^https?:\/\//, ""),
  };
}
