/**
 * The read-render-build pipeline behind every FULL-CONTENT feed.
 *
 * Shared the moment there were two of them (SmartNews and NewsBreak). Both
 * partners render the article themselves rather than linking out, both want the
 * whole body, and both would otherwise have been a copy of the same forty lines
 * — with the copies free to diverge on the questions that actually matter here:
 * which post-processing the syndicated body gets, and what happens to an
 * article whose body will not render.
 *
 * Everything partner-specific lives in the `FeedDefinition` (see `FEEDS`), so
 * adding a third aggregator is a definition plus a four-line route.
 */

import "server-only";
import {
  absolutizeHtml,
  classifyEmbedIframes,
  renderArticleBody,
} from "./article-body";
import { getFeedArticlesWithContent } from "./articles";
import { stripPastedColors } from "./blocknote";
import type { Article } from "./article-types";
import {
  buildRssFeed,
  NEWSBREAK_IFRAME_CLASSES,
  type FeedDefinition,
} from "./rss-feed";
import { escapeXml } from "./xml";

/**
 * The lead image, as the first thing in the syndicated body.
 *
 * Both partners render `content:encoded` as the whole article, and the page it
 * stands in for opens with the cover above the text — so without this the
 * syndicated copy starts abruptly on the first paragraph. `media:thumbnail`
 * carries the same image for a different purpose: the card in the aggregator's
 * article list, not the body.
 *
 * `<figure>` rather than a bare `<img>` because that is the structure
 * NewsBreak's specification asks for, and it is what the body's own images
 * already use — so the lead image and the rest of the article agree.
 */
function leadImage(article: Article): string {
  const cover = article.coverImageReal ?? article.ogImage;
  if (!cover) return "";
  const alt = escapeXml(article.coverImageAlt || article.title);
  return `<figure><img src="${escapeXml(cover)}" alt="${alt}" /></figure>`;
}

/**
 * One article's body, ready to syndicate.
 *
 * What this deliberately does NOT do is as important as what it does. The
 * article page post-processes the same HTML with heading ids, table scroll
 * wrappers and Next's image optimizer; none of those belong in a copy rendered
 * on someone else's origin, and `optimizeArticleImages` in particular rewrites
 * every `<img>` to a site-relative `/_next/image?...` URL that would resolve
 * against the aggregator's host and show nothing.
 */
function syndicationBody(article: Article, rendered: string, feed: FeedDefinition): string {
  // Pasted inline colours are stripped for the same reason the page strips
  // them: they outrank the reader's own theme, and here that reader is in
  // someone else's app.
  let html = leadImage(article) + stripPastedColors(rendered);
  if (feed.newsBreak) {
    html = classifyEmbedIframes(html, NEWSBREAK_IFRAME_CLASSES);
  }
  // Last, so it also resolves anything the steps above introduced.
  return absolutizeHtml(html);
}

/**
 * Cap used when a full-content feed does not declare its own `maxItems`.
 *
 * There is no such thing as an uncapped full-content feed: every item costs a
 * detail read plus a body render, so an omitted cap is an oversight rather than
 * a request for the whole archive, and the archive only grows. `FEEDS` sets
 * this explicitly on both feeds today — this is the floor under a future one
 * that forgets.
 */
const DEFAULT_MAX_ITEMS = 50;

export interface SyndicationFeed {
  xml: string;
  /** Items published. */
  itemCount: number;
  /** Articles read but dropped for having no renderable body. */
  droppedCount: number;
}

/**
 * Read the newest articles, render their bodies, and build `feed`.
 *
 * An article whose body will not render is DROPPED rather than published with
 * an empty `content:encoded`. Both partners treat the body as the article, so
 * an empty one publishes a blank page under our name — worse than the
 * article's absence, and both specifications call full content mandatory.
 */
export async function renderSyndicationFeed(
  feed: FeedDefinition,
): Promise<SyndicationFeed> {
  const articles = await getFeedArticlesWithContent(
    feed.maxItems ?? DEFAULT_MAX_ITEMS,
  );

  const bodies = new Map<string, string>();
  for (const article of articles) {
    // Sequential on purpose: the reads are already done and cached by this
    // point, and `contentJsonToHtml` is CPU-bound React rendering — running
    // fifty of those concurrently only contends for the same event loop.
    const rendered = await renderArticleBody(article);
    if (!rendered.trim()) continue;
    bodies.set(article.id, syndicationBody(article, rendered, feed));
  }

  const withBody = articles.filter((a) => bodies.has(a.id));

  return {
    xml: buildRssFeed(withBody, feed, bodies),
    itemCount: withBody.length,
    droppedCount: articles.length - withBody.length,
  };
}

/**
 * Response headers for a full-content feed.
 *
 * Unlike `FEED_HEADERS` (no-store) these allow caching, because an item here
 * costs a detail read plus a body render where a description-only item costs
 * neither. See the route comments for the measured numbers.
 */
export const SYNDICATION_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
} as const;
