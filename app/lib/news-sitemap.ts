/**
 * Google News sitemap document builder.
 *
 * Kept out of the route handler so the XML is a pure function of a list of
 * articles plus a clock — the same split `video-sitemap.ts` and `rss-feed.ts`
 * use. The clock is a parameter rather than an ambient `new Date()` because
 * this document's contents depend on it: see NEWS_WINDOW_DAYS.
 *
 * Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 *
 * A news sitemap is NOT a second copy of `/sitemap.xml` with extra tags. It
 * answers a different question — "what did you publish in the last couple of
 * days?" — and is read by a different crawler (Googlebot-News) on a much
 * shorter cycle. Everything below follows from that: the news blog only, a
 * two-day window, and a hard 1,000-entry cap.
 */

import type { Article } from "./article-types";
import { SITE_NAME, SITE_URL } from "./site";
import { escapeXml, w3cDate } from "./xml";

/**
 * Which blog is the news section.
 *
 * `hive` is EnergieBee's news and stories; `learn` is guides and tutorials —
 * evergreen reference material that is explicitly not news, and that Google
 * asks publishers to keep out of this file. The two-day window below does most
 * of the filtering on its own, but the section split is the part that states
 * the intent.
 *
 * If the backend ever grows a per-post "is news" flag, or the hive picks up a
 * non-news category, narrow `isNewsArticle` rather than this constant — the
 * blog is the URL prefix, the flag would be the editorial judgement.
 */
export const NEWS_BLOG: Article["blog"] = "hive";

/**
 * Google's cap for a single news sitemap: 1,000 `<news:news>` entries.
 *
 * Much smaller than the 50,000 of an ordinary sitemap, and unreachable in
 * practice here — it would take a thousand articles inside the two-day window —
 * but `buildNewsSitemap` enforces it anyway, because a file that exceeds the
 * cap is rejected outright rather than trimmed.
 */
export const MAX_NEWS_URLS = 1000;

/**
 * How recent an article must be to belong in this file.
 *
 * Google: articles must have been "created in the last two days", and older
 * URLs should be removed from the news sitemap. This is the whole of step 5 of
 * the brief ("keep only recent news articles") expressed as one number.
 *
 * A consequence worth knowing before anyone reports it as a bug: on a site that
 * publishes weekly, this file is EMPTY most of the time. That is the specified
 * behaviour, not a failure — an empty `<urlset>` is valid XML, returns 200, and
 * Search Console reports it as a sitemap with zero URLs. Articles are still
 * discovered through `/sitemap.xml`, which lists every one of them forever.
 *
 * Don't widen this to keep the file looking populated: stale entries are what
 * the spec asks publishers to remove, and they earn nothing — Googlebot-News
 * ignores an article outside the window wherever it finds it.
 */
export const NEWS_WINDOW_DAYS = 2;

/**
 * `<news:language>` — an ISO 639 code, two or three letters.
 *
 * Deliberately "en" and not the "en-GB" the site's `<html lang>` and RSS
 * channel carry: this field is specified as the bare language code (the only
 * region-qualified values Google accepts are `zh-cn` and `zh-tw`).
 */
export const NEWS_LANGUAGE = "en";

/**
 * `<news:publication><news:name>` — must match the publication name exactly as
 * it appears on the articles in Google News, which is the site name.
 */
export const NEWS_PUBLICATION_NAME = SITE_NAME;

/** Is this article part of the news section at all? */
export function isNewsArticle(article: Article): boolean {
  return article.blog === NEWS_BLOG;
}

/**
 * When the article was first published, or `null` if that can't be established.
 *
 * `publishedAt` is a true instant and the right answer. `authorDate` is the
 * fallback for a record that predates it — a calendar date stored at midnight
 * UTC, so it resolves to 00:00 on the day the author picked. Same order of
 * preference `getFeedArticles` sorts by, so the feeds and this file agree about
 * which article is newer.
 */
function publishedAt(article: Article): Date | null {
  const iso = w3cDate(article.publishedAt ?? article.authorDate);
  return iso ? new Date(iso) : null;
}

/** One `<url>` entry. Every field here is required by Google. */
function urlXml(article: Article, published: Date): string {
  const loc = `${SITE_URL}/${article.blog}/${article.slug}`;
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(NEWS_PUBLICATION_NAME)}</news:name>
        <news:language>${escapeXml(NEWS_LANGUAGE)}</news:language>
      </news:publication>
      <news:publication_date>${published.toISOString()}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>
  </url>`;
}

export interface NewsSitemap {
  xml: string;
  /** Entries actually listed. */
  urlCount: number;
  /** Entries that qualified before the 1,000 cap was applied. */
  qualifiedCount: number;
}

/**
 * Build the news sitemap for a set of articles, as of `now`.
 *
 * `articles` should be the published, indexable catalogue — the caller has
 * already dropped anything the article page marks `noindex` or points at a
 * foreign canonical, exactly as `/sitemap.xml` does, so this file can't
 * advertise a URL the site elsewhere asks Google to skip.
 *
 * Everything else is decided here, in this order:
 *
 *  1. News section only (`isNewsArticle`).
 *  2. A publication date we can stand behind — the field is REQUIRED, so an
 *     article without one is dropped rather than given today's date.
 *  3. A non-empty headline, for the same reason.
 *  4. Published inside the two-day window.
 *
 * Newest first, so that if MAX_NEWS_URLS ever bites it keeps the freshest
 * entries and drops the ones closest to ageing out anyway.
 */
export function buildNewsSitemap(
  articles: Article[],
  now: Date = new Date(),
): NewsSitemap {
  const cutoff = now.getTime() - NEWS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const qualified = articles
    .filter(isNewsArticle)
    .map((article) => ({ article, published: publishedAt(article) }))
    .filter(
      (entry): entry is { article: Article; published: Date } =>
        entry.published !== null && entry.article.title.trim() !== "",
    )
    // Strictly greater than the cutoff. A future-dated post — one the backend
    // has marked PUBLISHED ahead of its stated date — passes, which is correct:
    // the page is live, so the sitemap should say so, and testing the other end
    // of the window would make the file sensitive to a second of clock skew.
    .filter((entry) => entry.published.getTime() > cutoff)
    .sort((a, b) => b.published.getTime() - a.published.getTime());

  const listed = qualified.slice(0, MAX_NEWS_URLS);

  const body = listed.length
    ? `\n${listed.map((e) => urlXml(e.article, e.published)).join("\n")}\n`
    : "\n";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${body}</urlset>`;

  return { xml, urlCount: listed.length, qualifiedCount: qualified.length };
}
