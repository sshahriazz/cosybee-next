import { absolutizeHtml, renderArticleBody } from "@/app/lib/article-body";
import { getFeedArticlesWithContent } from "@/app/lib/articles";
import { stripPastedColors } from "@/app/lib/blocknote";
import { buildRssFeed, FEEDS } from "@/app/lib/rss-feed";
import type { Article } from "@/app/lib/article-types";
import { escapeXml } from "@/app/lib/xml";

/**
 * `/smartnews/smartnews.xml` — the SmartFormat feed given to SmartNews.
 *
 * SmartFormat is RSS 2.0 plus the `snf:`, `media:` and `content:` namespaces.
 * What makes it different from the site's other three feeds is that SmartNews
 * RENDERS the article itself, as a SmartView page, instead of linking out — so
 * the whole body travels in `content:encoded` and the channel carries the
 * publisher branding that page is framed with. Those extras are options on
 * `FEEDS.smartnews`, not a forked builder, so the four feeds cannot drift.
 *
 * The rules this route holds to:
 *
 *  1. The body must be the SAME body the page renders. Both go through
 *     `renderArticleBody`, so the feed can't quietly serve the stale
 *     `contentHtml` fallback while the canonical URL renders `contentJson`.
 *  2. An article whose body won't render is dropped, not published empty. A
 *     SmartView page with no text is worse than the article's absence, and
 *     `content:encoded` is a required field.
 *  3. No Next image optimizer. `optimizeArticleImages` rewrites `<img>` to
 *     `/_next/image?...`, which is both site-relative and useless off-origin —
 *     the one post-processing step the page does that must NOT happen here.
 *  4. Absolute URLs only, no tracking parameters. `absolutizeHtml` resolves
 *     anything root-relative; nothing in this codebase appends UTM parameters
 *     to an article URL, so canonical links are what the feed carries.
 *
 * Cost, measured rather than assumed — a production build, 50 items, ~920KB:
 * ~1.1s cold, ~0.6s steady. Next renders this route per request (the build
 * marks it `ƒ`, as it does `/video-sitemap.xml`), so what repeats is the fifty
 * `contentJsonToHtml` renders; the HTTP reads underneath do NOT repeat, because
 * this route — alone among the feeds — keeps the shared Data Cache instead of
 * the `force-dynamic` + `no-store` the other three use. Fifty uncached detail
 * reads on every poll would be real load; up to a minute of staleness on a feed
 * of articles is not, and a publish clears it immediately via `updateTag` in
 * `revalidateContent()`.
 *
 * Half a second per poll is worth less than a cache layer would cost: the only
 * primitive available for one here is `unstable_cache`, which Next 16 documents
 * as replaced. If this feed ever grows enough for that to stop being true, cap
 * `maxItems` lower before reaching for a deprecated API.
 */

/**
 * The lead image, as the first thing in the syndicated body.
 *
 * SmartView renders `content:encoded` as the whole article, and the page it is
 * standing in for opens with the cover above the text — so without this the
 * syndicated copy starts abruptly on the first paragraph. `media:thumbnail`
 * carries the same image but serves a different purpose: that one is the card
 * in SmartNews' article list, not the body.
 */
function leadImage(article: Article): string {
  const cover = article.coverImageReal ?? article.ogImage;
  if (!cover) return "";
  const alt = escapeXml(article.coverImageAlt || article.title);
  return `<figure><img src="${escapeXml(cover)}" alt="${alt}" /></figure>`;
}

export async function GET() {
  const feed = FEEDS.smartnews;
  const articles = await getFeedArticlesWithContent(feed.maxItems);

  const bodies = new Map<string, string>();
  for (const article of articles) {
    // Sequential on purpose: the reads are already done and cached by this
    // point, and `contentJsonToHtml` is CPU-bound React rendering — running
    // fifty of those concurrently just contends for the same event loop.
    const rendered = await renderArticleBody(article);
    if (!rendered.trim()) continue;
    bodies.set(
      article.id,
      absolutizeHtml(leadImage(article) + stripPastedColors(rendered)),
    );
  }

  // Rule 2: only articles that actually produced a body are published.
  const withBody = articles.filter((a) => bodies.has(a.id));

  return new Response(buildRssFeed(withBody, feed, bodies), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Agrees with the channel's own `<ttl>` (see FEEDS.smartnews), so a
      // poller honouring the feed and a CDN honouring the header hold the same
      // copy for the same five minutes.
      "Cache-Control":
        "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      // Cheap observability: whether a thin feed is thin because the catalogue
      // is, or because bodies failed to render, without parsing the body.
      "X-Feed-Item-Count": String(withBody.length),
      "X-Feed-Dropped-Count": String(articles.length - withBody.length),
    },
  });
}
