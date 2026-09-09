import { FEEDS } from "@/app/lib/rss-feed";
import {
  renderSyndicationFeed,
  SYNDICATION_HEADERS,
} from "@/app/lib/syndication-feed";

/**
 * `/smartnews/smartnews.xml` — the SmartFormat feed given to SmartNews.
 *
 * SmartFormat is RSS 2.0 plus the `snf:`, `media:` and `content:` namespaces.
 * What makes it different from the description-only feeds is that SmartNews
 * RENDERS the article itself, as a SmartView page, instead of linking out — so
 * the whole body travels in `content:encoded` and the channel carries the
 * publisher branding that page is framed with.
 *
 * Everything specific to this partner is an option on `FEEDS.smartnews`, and
 * the read-render-build pipeline is shared with `/newsbreak/newsbreak.xml` —
 * see `renderSyndicationFeed` for the rules both hold to. Adding a third
 * aggregator should not touch this file.
 *
 * Cost, measured rather than assumed — a production build, 50 items, ~920KB:
 * ~1.1s cold, ~0.6s steady. Next renders this route per request (the build
 * marks it `ƒ`, as it does `/video-sitemap.xml`), so what repeats is the fifty
 * `contentJsonToHtml` renders; the HTTP reads underneath do NOT repeat, because
 * the full-content feeds keep the shared Data Cache instead of the
 * `force-dynamic` + `no-store` the description-only three use. Fifty uncached
 * detail reads on every poll would be real load; up to a minute of staleness on
 * a feed of articles is not, and a publish clears it immediately via
 * `updateTag` in `revalidateContent()`.
 *
 * Half a second per poll is worth less than a cache layer would cost: the only
 * primitive available for one here is `unstable_cache`, which Next 16 documents
 * as replaced. If this feed ever grows enough for that to stop being true, cap
 * `maxItems` lower before reaching for a deprecated API.
 */
export async function GET() {
  const { xml, itemCount, droppedCount } = await renderSyndicationFeed(
    FEEDS.smartnews,
  );

  return new Response(xml, {
    headers: {
      ...SYNDICATION_HEADERS,
      // Cheap observability: whether a thin feed is thin because the catalogue
      // is, or because bodies failed to render, without parsing the body.
      "X-Feed-Item-Count": String(itemCount),
      "X-Feed-Dropped-Count": String(droppedCount),
    },
  });
}
