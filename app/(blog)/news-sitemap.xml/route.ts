import { connection } from "next/server";
import { getIndexableArticles } from "@/app/lib/articles";
import {
  buildNewsSitemap,
  MAX_NEWS_URLS,
  NEWS_BLOG,
  NEWS_WINDOW_DAYS,
} from "@/app/lib/news-sitemap";

/**
 * Generates /news-sitemap.xml — a Google News sitemap of the articles published
 * in the last {@link NEWS_WINDOW_DAYS} days.
 *
 * Why a file separate from `/sitemap.xml`: Next's `MetadataRoute.Sitemap` has no
 * vocabulary for the `news:` namespace, and it is a different document with a
 * different job — `/sitemap.xml` is the permanent record of every URL, this is
 * a short list of what is new, read by Googlebot-News on a much shorter cycle.
 * robots.txt advertises all three (see app/robots.ts).
 *
 * The rules this route holds to, in order of how quietly they break:
 *
 *  1. News only. `NEWS_BLOG` is the hive; the `learn` guides are evergreen
 *     reference material and Google asks publishers to keep them out.
 *  2. Recent only. Anything past the two-day window is dropped, which is the
 *     spec's own instruction — and means an EMPTY file whenever nothing has
 *     been published in the last two days. That is correct, not a fault; see
 *     `NEWS_WINDOW_DAYS` before "fixing" it.
 *  3. Only articles we can describe completely. `news:publication_date` and
 *     `news:title` are required, so an article missing either is dropped rather
 *     than emitted with a guessed date.
 *  4. Never list a URL the site tells Google to skip. `noindex` articles and
 *     ones pointing at a foreign canonical are filtered by
 *     `getIndexableArticles` — the same predicate `/sitemap.xml` uses, so the
 *     two files can't contradict each other.
 *  5. Never publish a truncated catalogue. The read underneath throws on a
 *     backend error rather than returning a short list, so a blip 500s here.
 *     That is the intended trade: Google retries a failed sitemap fetch, where
 *     a 200 carrying an empty `<urlset>` would be believed — it says "nothing
 *     was published", which is the one wrong answer this file can give.
 *
 * Freshness: unlike the other two sitemaps this one also goes stale on the
 * CLOCK — an article leaves the window with nothing having been edited. That is
 * what `connection()` below is for, and it is the one thing here that is easy to
 * get wrong: without it Next prerenders this route at BUILD time (it does
 * exactly that for `/sitemap.xml`), which would freeze `new Date()` at the
 * moment of the build and leave the two-day window sliding against a clock that
 * had stopped.
 *
 * `connection()` rather than `export const dynamic = "force-dynamic"`: the
 * latter also forces every fetch to `no-store`, which would throw away the
 * article read's shared Data Cache entry — the same one `/sitemap.xml` and the
 * hive hub use — and re-walk the paginated catalogue on every crawler hit.
 * `connection()` moves only the RENDER to request time. The read underneath
 * keeps its 60s TTL and its CONTENT_TAG, so an admin publish still expires it
 * via `revalidateContent()` and the next request sees the new article.
 */
export async function GET() {
  // Request-time rendering, so the two-day window is measured against the clock
  // now and not the clock at build. See the note above.
  await connection();

  const articles = await getIndexableArticles(NEWS_BLOG);

  const { xml, urlCount, qualifiedCount } = buildNewsSitemap(articles);

  if (qualifiedCount > MAX_NEWS_URLS) {
    // Sliced to stay valid — a news sitemap over the cap is rejected outright,
    // where a short one still works. Loud, because reaching this means the
    // publishing rate has outgrown a single file and it needs splitting into a
    // sitemap index before entries start silently going missing.
    console.error(
      `[news-sitemap] ${qualifiedCount} articles in the last ${NEWS_WINDOW_DAYS} days exceeds Google's ${MAX_NEWS_URLS} cap — split into a sitemap index.`,
    );
  }

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Mirrors the Data Cache TTL behind it (api.ts): rendering per request
      // costs nothing extra while the read is still cached, and this bounds how
      // often a crawler can reach the origin. A publish can therefore take up
      // to a minute to clear a CDN copy — immaterial against a two-day window,
      // and `max-age=0` keeps browsers from holding one at all.
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      // Cheap observability: tells you at a glance whether the file is empty
      // because nothing was published or because the read came back wrong,
      // without parsing the body.
      "X-News-Article-Count": String(urlCount),
    },
  });
}
