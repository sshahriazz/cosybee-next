/**
 * Turning an article's authored document into HTML.
 *
 * Extracted from `ArticleDetail` when the SmartNews feed became a second
 * consumer. `content:encoded` has to carry the SAME body the page renders — a
 * feed that quietly serves the stale `contentHtml` fallback while the page
 * renders `contentJson` would republish a different article to the aggregator
 * than the one at the canonical URL, which is the kind of divergence nobody
 * notices until a reader points it out.
 *
 * Only the SOURCE resolution is shared. What each consumer does afterwards is
 * legitimately different: the page adds heading ids, table scroll wrappers and
 * Next's image optimizer; a syndicated copy wants none of those (see
 * `absolutizeHtml`).
 */

import type { Article } from "./article-types";
import { contentJsonToHtml } from "./blocknote";
import { isLegacyContent, renderLegacyContent } from "./legacy-content";
import { SITE_URL } from "./site";

/**
 * The article body as HTML, from whichever source the post actually carries.
 *
 * The document is authored in BlockNote, so the BlockNote server renderer is
 * the source of truth: render `contentJson` with the shared schema (multi-column
 * included) for perfect fidelity. Older posts may instead carry the legacy
 * `{ sections }` shape, and the backend-rendered `contentHtml` is the
 * last-resort fallback.
 *
 * Returns `""` for a post with no body at all rather than throwing — a coverless
 * or empty draft is a real state in the admin preview.
 */
export async function renderArticleBody(article: Article): Promise<string> {
  if (isLegacyContent(article.contentJson)) {
    return renderLegacyContent(article.contentJson) ?? article.contentHtml ?? "";
  }
  const blockNoteHtml = article.contentJson
    ? await contentJsonToHtml(article.contentJson)
    : "";
  return blockNoteHtml || article.contentHtml || "";
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
