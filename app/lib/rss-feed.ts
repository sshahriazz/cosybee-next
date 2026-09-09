/**
 * RSS 2.0 document builder shared by every feed the site publishes.
 *
 * Kept out of the route handlers so the XML is a pure function of a list of
 * articles plus a `FeedDefinition` — the same split `video-sitemap.ts` uses.
 * The reason there is more than one feed at all is that syndication partners
 * each want their own URL: NewsNow and Apple News poll a feed they were given,
 * and giving them a path of their own means a partner-specific change (extra
 * elements, a narrower article set) can be made without touching the public
 * `/rss.xml` that readers subscribe to.
 *
 * Today all three feeds carry the SAME items — only the channel title and the
 * `atom:self` link differ. That is deliberate: see `FEEDS` for where the
 * partner-specific parts belong when they arrive.
 */

import type { Article } from "./article-types";
import {
  ORG_CONTACT_EMAIL,
  ORG_LEGAL_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  url,
} from "./site";
import { escapeXml } from "./xml";

/** Best-effort RFC-822 date (required by RSS) from an ISO string. */
export function rfc822(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return (isNaN(d.getTime()) ? new Date() : d).toUTCString();
}

/** One published feed: its path, and how the channel introduces itself. */
export type FeedDefinition = {
  /** Site-relative path this feed is served from. */
  path: string;
  /** `<channel><title>`. */
  title: string;
  /** `<channel><description>`. Defaults to the site description. */
  description?: string;
};

/**
 * Every feed the site serves, keyed by the route that serves it.
 *
 * `path` MUST match the route's own URL: it becomes the `atom:self` link, which
 * is how a reader (and a partner's ingest log) identifies which feed it is
 * holding. Adding a feed here is not enough — it needs a matching route.
 *
 * When a partner needs more than the shared item shape — Apple News wants
 * `content:encoded` with the full article body, for instance — that belongs in
 * an option on this definition rather than in a forked copy of the builder, so
 * the feeds cannot silently drift apart.
 */
export const FEEDS = {
  /** The public feed readers subscribe to, linked from every page's metadata. */
  blog: {
    path: "/rss.xml",
    title: `${SITE_NAME} — Blog`,
  },
  /** Polled by NewsNow; the title is what shows in their directory. */
  newsnow: {
    path: "/newsnow/newsnow.xml",
    title: `${SITE_NAME} — News`,
  },
  /** Polled by Apple News; the title becomes the channel name in the app. */
  applenews: {
    path: "/news/applenews.xml",
    title: `${SITE_NAME} — News`,
  },
} as const satisfies Record<string, FeedDefinition>;

function itemXml(a: Article): string {
  const link = url(`/${a.blog}/${a.slug}`);
  const desc = a.seoDescription ?? a.description ?? "";
  const categories = a.tags
    .map((t) => `<category>${escapeXml(t.name)}</category>`)
    .join("");
  return `    <item>
      <title>${escapeXml(a.seoTitle ?? a.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${rfc822(a.publishedAt ?? a.authorDate)}</pubDate>
      ${a.author?.name ? `<dc:creator>${escapeXml(a.author.name)}</dc:creator>` : ""}
      ${a.category?.name ? `<category>${escapeXml(a.category.name)}</category>` : ""}
      ${categories}
      <description>${escapeXml(desc)}</description>
    </item>`;
}

/**
 * Render an RSS 2.0 document for `feed` over `articles`.
 *
 * `articles` are emitted in the order given — pass them newest-first
 * (`getFeedArticles` already does), which is what every aggregator expects.
 */
export function buildRssFeed(
  articles: Article[],
  feed: FeedDefinition,
): string {
  const lastBuild = rfc822(articles[0]?.publishedAt ?? null);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <atom:link href="${escapeXml(url(feed.path))}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(feed.description ?? SITE_DESCRIPTION)}</description>
    <language>en-GB</language>
    <copyright>© ${ORG_LEGAL_NAME}</copyright>
    <managingEditor>${escapeXml(ORG_CONTACT_EMAIL)} (${escapeXml(ORG_LEGAL_NAME)})</managingEditor>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${articles.map(itemXml).join("\n")}
  </channel>
</rss>`;
}

/**
 * Response headers every feed route returns.
 *
 * No caching anywhere (browser, CDN/edge) — every request rebuilds the feed
 * from the latest published posts, which is what the partners' pollers are
 * asking for when they hit the URL.
 */
export const FEED_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
} as const;
