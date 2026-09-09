import "server-only";
import { cache } from "react";
import { api, type ApiPost, type Blog } from "./api";
import {
  resolveCoverImage,
  toArticleSummary,
  tagSlug,
  validImageOrNull,
  type Article,
  type ArticleSummary,
  type Author,
  type Category,
  type CategorySummary,
  type Tag,
  UNCATEGORISED_SLUG,
} from "./article-types";
import { SITE_URL } from "./site";
import { FALLBACK_PHRASES, type Phrase } from "./phrase-of-the-week";

export type {
  Article,
  ArticleSummary,
  Author,
  Category,
  CategorySummary,
  Tag,
} from "./article-types";
export { formatReadTime, tagSlug } from "./article-types";
export type { Blog } from "./api";

/** Normalize category - handles both old (string) and new (object) formats. */
function normalizeCategory(
  category: string | Category | undefined,
  blog: "hive" | "learn",
): Category {
  if (!category) {
    return {
      id: "",
      blog,
      name: "Uncategorised",
      slug: UNCATEGORISED_SLUG,
      description: null,
    };
  }
  if (typeof category === "string") {
    // Old format: category is just a string name
    return {
      id: "",
      blog,
      name: category,
      slug: category.toLowerCase().replace(/\s+/g, "-"),
      description: null,
    };
  }
  // New format: already a Category object
  return category;
}

/** Normalize tags - handles both old (string[]) and new (Tag[]) formats. */
function normalizeTags(tags: (string | Tag)[] | undefined): Tag[] {
  if (!tags || tags.length === 0) return [];
  return tags.map((t) => {
    if (typeof t === "string") {
      // Old format: tag is just a string. `tagSlug` slugifies properly — the
      // previous inline `replace(/\s+/g, "-")` kept punctuation, so "Solar &
      // Wind" produced a slug no route could ever match.
      return {
        id: "",
        name: t,
        slug: tagSlug(t),
      };
    }
    // New format: already a Tag object — its stored slug is authoritative.
    return t;
  });
}

/** Normalize author - handles both old (authorName string) and new (object) formats. */
function normalizeAuthor(
  author: Author | undefined,
  authorName: string | undefined,
): Author {
  if (author && typeof author === "object" && author.name) {
    return author;
  }
  // Old format: use authorName field
  const name = authorName ?? "energiebee";
  return {
    id: "",
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    avatarUrl: null,
    bio: null,
    role: null,
  };
}

/** Transform API post to frontend Article shape. */
function toArticle(post: ApiPost): Article {
  return {
    id: post.id,
    blog: post.blog,
    slug: post.slug,
    title: post.title,
    description: post.description ?? "",
    lede: post.lede,

    // SEO
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,

    // Taxonomy (normalized from backend - handles both old and new formats)
    author: normalizeAuthor(post.author, post.authorName),
    category: normalizeCategory(post.category, post.blog),
    tags: normalizeTags(post.tags),

    // Media
    coverImage: resolveCoverImage(post.coverImage, post.ogImage),
    // The genuine cover (no og/placeholder fallback) — the hero uses this.
    coverImageReal: validImageOrNull(post.coverImage),
    coverImageAlt: post.coverImageAlt ?? "",
    coverImageTitle: post.coverImageTitle ?? null,
    coverImageCaption: post.coverImageCaption ?? null,
    coverImageCredit: post.coverImageCredit ?? null,

    // SEO / social
    ogImage: post.ogImage ?? null,
    ogImageAlt: post.ogImageAlt ?? null,
    canonicalUrl: post.canonicalUrl ?? null,
    noindex: post.noindex ?? false,
    jsonLd: post.jsonLd ?? null,

    // Display
    readTime: post.readTime ?? 1,
    authorDate: post.authorDate ?? "",

    // Featured/Carousel
    featured: post.featured ?? false,
    homeFeatured: post.homeFeatured ?? false,
    carouselIntro: post.carouselIntro,
    carouselBody: post.carouselBody,

    // CTA (flattened)
    ctaLabel: post.ctaLabel,
    ctaHref: post.ctaHref,
    ctaExternal: post.ctaExternal ?? false,

    // Status
    status: post.status ?? "DRAFT",
    publishedAt: post.publishedAt,

    // Content
    contentJson: post.contentJson ?? null,
    contentHtml: post.contentHtml ?? null,

    // Timestamps
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

/** Published articles for a blog, newest first. */
export async function getArticles(blog: Blog): Promise<Article[]> {
  const response = await api.getPosts(blog);
  return response.data.map(toArticle);
}

/**
 * The newest published articles for a blog, capped at `limit`.
 *
 * Asks the API for exactly as many as the caller needs rather than pulling a
 * full page and slicing — this runs behind the footer, so it is on the render
 * path of every page on the site.
 *
 * Deliberately tolerant: an API failure resolves to an empty list rather than
 * throwing. The opposite rule applies to the catalogue crawls (see
 * `getAllPublishedPosts`), where a short answer would be published to Google as
 * if it were the truth. Here the caller falls back to a static list, and a
 * momentarily stale footer column beats a 500 on every page of the site.
 */
export async function getLatestArticles(
  blog: Blog,
  limit = 4,
): Promise<Article[]> {
  const response = await api.getPosts(blog, 1, limit);
  return response.data.map(toArticle);
}

/** Articles flagged for the featured carousel. */
export async function getFeatured(blog: Blog): Promise<Article[]> {
  const response = await api.getFeatured(blog);
  return response.data.map(toArticle);
}

/**
 * Articles flagged for the home-page featured section. Pulls from both blogs
 * (the home page isn't blog-scoped) and returns them newest-first. Each
 * article keeps its own `blog`, so the card link resolves to `/hive` or
 * `/learn` accordingly.
 */
export async function getHomeFeatured(): Promise<Article[]> {
  const [hive, learn] = await Promise.all([
    api.getHomeFeatured("hive"),
    api.getHomeFeatured("learn"),
  ]);
  return [...hive.data, ...learn.data]
    .map(toArticle)
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? b.authorDate).getTime() -
        new Date(a.publishedAt ?? a.authorDate).getTime(),
    );
}

/** Distinct categories for a blog's filter bar (full Category objects). */
export async function getCategories(blog: Blog): Promise<Category[]> {
  const response = await api.getCategories(blog);
  return response.data;
}

/** Category names for a blog's filter bar, prefixed with "All". */
export async function getCategoryNames(blog: Blog): Promise<string[]> {
  const response = await api.getCategories(blog);
  return ["All", ...response.data.map((c) => c.name)];
}

/** All tags for a blog. */
export async function getTags(blog: Blog): Promise<Tag[]> {
  const response = await api.getTags(blog);
  return response.data;
}

/**
 * A single *published* article with rendered body HTML, or null.
 *
 * The status check is deliberately redundant — the API applies the same filter —
 * because this is the one function behind every by-slug read on the site (both
 * article pages and the OG card), and the cost of the API regressing is a full
 * 200 with content and JSON-LD on a URL the author took down. Google indexes
 * that. One `if` here means unpublishing can only ever produce a 404.
 *
 * Status only, deliberately: scheduling is left to the API, which is the single
 * clock that matters. Re-checking `publishedAt <= now` against *this* server's
 * clock would mean any skew ahead of the backend's turns a just-published
 * article into a 404 that then caches for the fetch TTL — trading the bug this
 * guards against for a worse one.
 */
export async function getArticleBySlug(
  blog: Blog,
  slug: string,
): Promise<Article | null> {
  const post = await api.getPost(blog, slug);
  if (!post || post.status !== "PUBLISHED") return null;
  return toArticle(post);
}

/**
 * The address a retired URL should redirect to, or null to 404.
 *
 * Renaming a post's slug (or moving it between blogs) leaves the old URL with
 * nothing behind it; the backend records the address the post vacated, and
 * this asks where it went. Null covers both "never existed" and "the post has
 * since been unpublished" — redirecting to a draft would only land the visitor
 * on a second 404, so both cases stay a plain 404 here.
 */
export async function resolveRetiredSlug(
  blog: Blog,
  slug: string,
): Promise<string | null> {
  const target = await api.resolvePostSlug(blog, slug);
  if (!target || !target.isLive) return null;
  // Guard against a row that somehow points at itself: redirecting a URL to
  // itself is an infinite loop in the browser, and a 404 is the safer failure.
  if (target.blog === blog && target.slug === slug) return null;
  return `/${target.blog}/${target.slug}`;
}

/** Related articles for the in-article footer (excludes current). */
export async function getRelated(
  blog: Blog,
  slug: string,
  limit = 4,
): Promise<Article[]> {
  const response = await api.getRelated(blog, slug, limit);
  return response.data.map(toArticle);
}

/** Published slugs for a blog — used by generateStaticParams. */
export async function getPublishedSlugs(blog: Blog): Promise<string[]> {
  const response = await api.getSlugs(blog);
  return response.data;
}

const PER_PAGE = 50; // API caps the limit (larger values 400)
const MAX_PAGES = 100; // hard safety cap: 5,000 posts

/**
 * Fetch every published post for a blog, paginating within the API's page-size
 * limit. The API rejects large limits with a 400, so we walk pages instead.
 *
 * Throws — deliberately — if any page fails or the walk would be truncated.
 * Callers here feed the sitemap, the feeds and the tag/author archives, where a
 * short list is not a smaller truth but a wrong one: it reads as "those pages
 * are gone" and gets cached and served in that state. The previous version used
 * the tolerant `getPosts`, whose empty fallback carries `totalPages: 0` — so a
 * failure on page 3 of 8 ended the loop and returned pages 1-2 as if that were
 * the whole catalogue, with nothing logged.
 *
 * Wrapped in React `cache()` so the walk runs ONCE per request. The blog hubs
 * ask for the catalogue three times over — `generateMetadata` needs the
 * categories, and the page body needs both the articles and the categories,
 * each of which lands here. `fetch` already de-duplicates the network calls,
 * but nothing de-duplicated the loop around them or the `toArticle` mapping
 * downstream, so the whole catalogue was parsed and mapped three times per
 * render. It matters more than the count suggests: the walk is SEQUENTIAL by
 * necessity (page N+1's existence is only known once page N answers), so past
 * the 50-post page size each repeat costs another serial round trip.
 */
const getAllPublishedPosts = cache(async (blog: Blog): Promise<ApiPost[]> => {
  const out: ApiPost[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await api.getPostsStrict(blog, page, PER_PAGE);
    out.push(...res.data);
    totalPages = res.pagination?.totalPages ?? 0;
    page++;
  } while (page <= totalPages && page <= MAX_PAGES);

  if (totalPages > MAX_PAGES) {
    throw new Error(
      `${blog}: ${totalPages} pages exceeds the ${MAX_PAGES}-page cap — raise MAX_PAGES rather than publish a truncated catalogue.`,
    );
  }
  return out;
});

/** Fields every dated record shares — enough to pick a real `lastModified`. */
type Dated = {
  updatedAt?: string;
  publishedAt?: string | null;
  authorDate?: string;
};

/**
 * The most trustworthy modification date available, newest signal first.
 * `updatedAt` is always set by the backend, so the final fallback is unreachable
 * in practice — it exists so a malformed record can't produce an `Invalid Date`.
 */
function lastModifiedOf(p: Dated): Date {
  return new Date(p.updatedAt || p.publishedAt || p.authorDate || Date.now());
}

/** The newest `lastModified` in a set, or undefined when the set is empty. */
export function newestOf(items: { lastModified: Date }[]): Date | undefined {
  return items.reduce<Date | undefined>(
    (max, i) => (!max || i.lastModified > max ? i.lastModified : max),
    undefined,
  );
}

/**
 * How many published articles a blog holds — the divisor behind the hubs'
 * browse pagination, for callers that need the count and not the articles.
 *
 * Counts *every* published post, including `noindex` ones: the hub lists them,
 * so they take up a slot on a browse page. The sitemap uses this (not the
 * shorter `getSitemapArticles` list) so the `?page=` URLs it advertises are the
 * same pages the hub will actually serve.
 */
export async function getPublishedCount(blog: Blog): Promise<number> {
  const posts = await getAllPublishedPosts(blog);
  return posts.length;
}

/** Every published article for a blog (all pages) — for tag pages & search. */
export const getAllArticles = cache(async (blog: Blog): Promise<Article[]> => {
  const posts = await getAllPublishedPosts(blog);
  return posts.map(toArticle);
});

/**
 * Every published article for a blog, narrowed to what a listing renders.
 *
 * The blog hubs' read. They pass their whole catalogue into `BlogBrowse`, a
 * CLIENT component, so every field survives into the RSC payload and crosses
 * the wire — see `ArticleSummary` for what that was costing. Prefer this over
 * `getAllArticles` anywhere the result is handed to a client component; reach
 * for the full article only where the detail view's own fields are needed.
 */
export async function getArticleSummaries(
  blog: Blog,
): Promise<ArticleSummary[]> {
  const articles = await getAllArticles(blog);
  return articles.map(toArticleSummary);
}

/** `getFeatured`, narrowed for the carousel — see `getArticleSummaries`. */
export async function getFeaturedSummaries(
  blog: Blog,
): Promise<ArticleSummary[]> {
  const featured = await getFeatured(blog);
  return featured.map(toArticleSummary);
}

/**
 * Every published article across both blogs, newest first — the article list
 * behind every RSS feed (`/rss.xml` and the syndication feeds — see `FEEDS`).
 *
 * Shared so the feeds cannot disagree about what has been published or in what
 * order. A backend error yields an EMPTY list rather than throwing: a feed is
 * refetched constantly, so serving an empty channel for one poll is recoverable
 * in a way that a 500 in a partner's ingest log is not. That is the opposite
 * trade-off to the sitemap reads, which throw so a blip can't cache "these
 * pages are gone".
 */
export async function getFeedArticles(): Promise<Article[]> {
  const [hive, learn] = await Promise.all([
    getAllArticles("hive").catch(() => [] as Article[]),
    getAllArticles("learn").catch(() => [] as Article[]),
  ]);

  return [...hive, ...learn].sort((a, b) => {
    const ta = new Date(a.publishedAt ?? a.authorDate ?? 0).getTime();
    const tb = new Date(b.publishedAt ?? b.authorDate ?? 0).getTime();
    return tb - ta;
  });
}

/** Does an author object carry any profile detail worth a page header? */
function hasAuthorDetail(a: Author): boolean {
  return Boolean(a.bio || a.avatarUrl || a.role);
}

/** An author with a live page, plus what the sitemap needs to describe it. */
export type AuthorSummary = {
  slug: string;
  /** Richest bio seen across their posts — the page's only unique copy. */
  bio: string | null;
  /** Published articles across both blogs. */
  count: number;
  /** Newest article of theirs — the real "last changed" for the archive. */
  lastModified: Date;
};

/**
 * Every author with at least one published article, across both blogs.
 * Drives the author-page static params, the sitemap, and the `index` decision.
 *
 * Keyed on `author.slug`, the same field the byline links and `getAuthorProfile`
 * use, so params, links and sitemap entries cannot drift apart.
 */
export async function getAuthorSummaries(): Promise<AuthorSummary[]> {
  const [hive, learn] = await Promise.all([
    getAllArticles("hive"),
    getAllArticles("learn"),
  ]);
  const bySlug = new Map<string, AuthorSummary>();
  for (const a of [...hive, ...learn]) {
    const slug = a.author?.slug;
    if (!slug) continue;
    const modified = lastModifiedOf(a);
    const existing = bySlug.get(slug);
    if (!existing) {
      bySlug.set(slug, {
        slug,
        bio: a.author.bio,
        count: 1,
        lastModified: modified,
      });
      continue;
    }
    existing.count += 1;
    // Only some posts may carry the full author record — keep the first bio.
    existing.bio ??= a.author.bio;
    if (modified > existing.lastModified) existing.lastModified = modified;
  }
  return [...bySlug.values()];
}

/**
 * An author's profile + their published articles (newest first, both blogs).
 * Returns null if the slug matches no author. Picks the richest author object
 * seen (one with a bio/avatar/role) so the header isn't empty when only some
 * posts carry full author detail.
 */
export async function getAuthorProfile(
  slug: string,
): Promise<{ author: Author; articles: Article[] } | null> {
  const [hive, learn] = await Promise.all([
    getAllArticles("hive"),
    getAllArticles("learn"),
  ]);
  const mine = [...hive, ...learn].filter((a) => a.author?.slug === slug);
  if (mine.length === 0) return null;

  const author = mine
    .map((a) => a.author)
    .reduce((best, cur) =>
      hasAuthorDetail(cur) && !hasAuthorDetail(best) ? cur : best,
    );

  const articles = mine.sort(
    (a, b) =>
      new Date(b.publishedAt ?? b.authorDate ?? 0).getTime() -
      new Date(a.publishedAt ?? a.authorDate ?? 0).getTime(),
  );
  return { author, articles };
}

/**
 * Does this post's `canonicalUrl` point at something other than the post itself?
 *
 * A self-referential canonical (the common case when the field is filled in at
 * all) changes nothing and the post stays listed. One pointing elsewhere is the
 * author saying "the version to rank lives over there" — listing it would put
 * the sitemap in direct conflict with the page's own `<link rel="canonical">`,
 * and Google resolves that by trusting neither.
 */
function hasForeignCanonical(p: ApiPost): boolean {
  if (!p.canonicalUrl) return false;
  const own = `/${p.blog}/${p.slug}`;
  try {
    const { pathname } = new URL(p.canonicalUrl, SITE_URL);
    return pathname.replace(/\/$/, "") !== own;
  } catch {
    return true; // unparseable → can't prove it's ours, so don't advertise it
  }
}

/**
 * May this published post be advertised to a search engine at its own URL?
 *
 * The one test behind every file that enumerates the catalogue for a crawler —
 * `/sitemap.xml`, `/video-sitemap.xml` and `/news-sitemap.xml`. A sitemap is an
 * explicit "please index this", so a post the detail page renders as `noindex`,
 * or points at a foreign canonical, must not appear in any of them: a sitemap
 * that contradicts the page it lists is a Search Console warning and a wasted
 * crawl, not a second opinion.
 *
 * Shared rather than repeated so the three files cannot drift into disagreeing
 * about what is publishable.
 */
function isAdvertisable(p: ApiPost): boolean {
  return !p.noindex && !hasForeignCanonical(p);
}

/**
 * Published article URLs for the sitemap, excluding anything the article page
 * itself asks Google to skip — see `isAdvertisable`.
 */
export async function getSitemapArticles(
  blog: Blog,
): Promise<{ path: string; lastModified: Date }[]> {
  const posts = await getAllPublishedPosts(blog);
  return posts.filter(isAdvertisable).map((p) => ({
    path: `/${blog}/${p.slug}`,
    lastModified: lastModifiedOf(p),
  }));
}

/**
 * Every published, indexable article for a blog — the list-endpoint read, so no
 * body JSON (see `getIndexableArticlesWithContent` when the body is needed).
 *
 * The full-article counterpart to `getSitemapArticles`, for the crawler files
 * that need more than a URL and a date: `/news-sitemap.xml` reads each
 * article's headline and publication instant. Same `isAdvertisable` filter, so
 * it lists exactly the URLs `/sitemap.xml` does. Throws rather than truncating —
 * see `getAllPublishedPosts`.
 */
export async function getIndexableArticles(blog: Blog): Promise<Article[]> {
  const posts = await getAllPublishedPosts(blog);
  return posts.filter(isAdvertisable).map(toArticle);
}

/**
 * How many article detail reads to have in flight at once.
 *
 * The video sitemap needs every published article's `contentJson`, which only
 * the detail endpoint returns — so it is inherently one request per article.
 * Unbounded `Promise.all` over a few hundred slugs would open a few hundred
 * sockets at once and is the kind of thing that takes the backend down at the
 * exact moment a crawler asks for the file.
 */
const DETAIL_CONCURRENCY = 8;

/** Map over `items` with a bounded number of concurrent workers. */
async function mapLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await fn(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/**
 * Every published, indexable article for a blog WITH its body JSON.
 *
 * Exists because the list endpoint strips `contentJson` — so anything that has
 * to look inside article bodies across the whole catalogue (the video sitemap)
 * needs a detail read per article. Those reads use the same URL and cache
 * options as the article pages' own reads, so they share Data Cache entries
 * rather than doubling traffic, and `revalidateContent()` clears both together.
 *
 * Filtered by `isAdvertisable`, the same predicate as `getSitemapArticles`: an
 * article the page marks `noindex`, or which points its canonical elsewhere,
 * must not be advertised here either. Throws rather than truncating — see
 * `getAllPublishedPosts`.
 */
export async function getIndexableArticlesWithContent(
  blog: Blog,
): Promise<Article[]> {
  const posts = await getAllPublishedPosts(blog);
  const indexable = posts.filter(isAdvertisable);
  const details = await mapLimited(indexable, DETAIL_CONCURRENCY, (p) =>
    api.getPostForCrawl(blog, p.slug),
  );
  // A null is a post unpublished mid-crawl (see `getPostForCrawl`) — drop it.
  return details.filter((p): p is ApiPost => p !== null).map(toArticle);
}

/**
 * Minimum published articles a tag needs before its landing page earns a spot
 * in the sitemap and an `index` directive.
 *
 * A tag page has no content of its own — it's a heading plus links to articles
 * Google already indexed under their own URLs. Below this threshold there's
 * nothing unique to rank, so Google crawls the page and files it under
 * "Crawled – currently not indexed": wasted crawl budget, and dozens of phantom
 * failures in the coverage report that bury the real ones.
 *
 * Thin tags still render and stay linked from articles — they just switch to
 * `noindex, follow`, so the outbound links keep counting. Raise to 3 to be
 * stricter; check the count distribution first, as each step strands more tags.
 */
export const MIN_TAG_ARTICLES = 1;

/**
 * Whether a tag landing page should be indexed *and* listed in the sitemap.
 *
 * One predicate for both so the two can never disagree: the sitemap saying
 * "index this" while the page's own meta says `noindex` is the contradiction
 * this function exists to prevent.
 */
export function isIndexableTag(articleCount: number): boolean {
  return articleCount >= MIN_TAG_ARTICLES;
}

/**
 * Minimum published articles before a *bio-less* author archive is worth
 * indexing. An author page's unique content is the bio — see `isIndexableAuthor`.
 */
export const MIN_AUTHOR_ARTICLES = 2;

/**
 * Whether an author archive should be indexed *and* listed in the sitemap.
 *
 * Deliberately not a pure count. An author page carries something a tag page
 * never does: an identity. With a bio it is the entity page the article bylines
 * and `Person` JSON-LD both point at — real unique copy, and the page Google
 * looks for when corroborating who wrote something (E-E-A-T). That is worth
 * indexing on the strength of one article. Without a bio it is a name over a
 * card grid, thin in exactly the way a one-article tag page is.
 */
export function isIndexableAuthor(
  articleCount: number,
  bio: string | null,
): boolean {
  return articleCount >= MIN_AUTHOR_ARTICLES || Boolean(bio?.trim());
}

/**
 * Minimum published articles before a category landing page is worth indexing.
 *
 * Lower than the tag bar on purpose. Categories are a small, curated set the
 * editors choose and the site navigates by — they are part of the information
 * architecture, not a long tail, so even a young one is a real destination that
 * will fill up. Tags are the opposite: anyone can coin one, most collect a
 * single article, and a page restating one article it links to is what Google
 * files under "Crawled – currently not indexed".
 */
export const MIN_CATEGORY_ARTICLES = 1;

/**
 * Whether a category landing page should be indexed *and* listed in the
 * sitemap. One predicate for both, for the same reason as `isIndexableTag`:
 * the sitemap and the page's own `robots` must never disagree.
 */
export function isIndexableCategory(articleCount: number): boolean {
  return articleCount >= MIN_CATEGORY_ARTICLES;
}

/**
 * Categories that a blog's published articles are actually filed under, keyed
 * by the category's stored slug — the same value the chips link to and the
 * category route resolves.
 *
 * Derived from the posts rather than read from `/categories` deliberately: the
 * API's list includes categories with nothing published in them, and a chip or
 * a sitemap entry pointing at an empty category is a 404 we advertised
 * ourselves. Every URL this produces has at least one article behind it.
 */
export const getCategorySummaries = cache(async (
  blog: Blog,
): Promise<CategorySummary[]> => {
  const articles = await getAllArticles(blog);
  const bySlug = new Map<string, CategorySummary>();
  for (const a of articles) {
    const { slug, name } = a.category;
    // The placeholder for posts with no category is skipped along with the
    // empty slug: this one function feeds the hub filter chips, the
    // browse-by-category links, the chip rail on the category pages, the
    // prerendered category params and the sitemap, so dropping it here removes
    // it from all of them at once instead of leaving a chip pointing at a URL
    // the sitemap no longer lists (or the reverse).
    if (!slug || slug === UNCATEGORISED_SLUG) continue;
    const modified = lastModifiedOf(a);
    const existing = bySlug.get(slug);
    if (!existing) {
      bySlug.set(slug, { slug, name, count: 1, lastModified: modified });
      continue;
    }
    existing.count += 1;
    if (modified > existing.lastModified) existing.lastModified = modified;
  }
  return [...bySlug.values()];
});

/**
 * Resolve a `/[blog]/category/[slug]` URL to its label and articles, or null
 * when no published article is filed under it.
 *
 * Matching is on `category.slug` only — the same field the chips build their
 * hrefs from — so a category renamed in the admin keeps its URL working
 * instead of stranding every link and sitemap entry pointing at it. (This is
 * the failure `getTagArticles` documents; categories are matched the same way
 * so they can't repeat it.)
 */
export async function getCategoryArticles(
  blog: Blog,
  slug: string,
): Promise<{ label: string; articles: Article[] } | null> {
  // No landing page for the "no category" placeholder — it is excluded from
  // the chips and the sitemap, and a page nothing links to but Google can still
  // reach is exactly the orphan those links exist to avoid.
  if (slug === UNCATEGORISED_SLUG) return null;
  const articles = await getAllArticles(blog);
  const matches = articles.filter((a) => a.category.slug === slug);
  if (matches.length === 0) return null;
  return { label: matches[0].category.name, articles: matches };
}

/** A tag with a live landing page, plus what the sitemap needs to describe it. */
export type TagSummary = {
  slug: string;
  name: string;
  /** Published articles in this blog carrying the tag. */
  count: number;
  /** Newest article carrying it — the real "last changed" for the listing. */
  lastModified: Date;
};

/**
 * Tags used by a blog's published articles, keyed by `tagSlug` — the stored
 * slug, which is also what the chips link to and what the tag route resolves.
 * Every URL this produces is therefore one the site genuinely links and the
 * page genuinely serves. A tag repeated on a single article counts once.
 */
export async function getTagSummaries(blog: Blog): Promise<TagSummary[]> {
  const posts = await getAllPublishedPosts(blog);
  const bySlug = new Map<string, TagSummary>();
  for (const p of posts) {
    const modified = lastModifiedOf(p);
    // A post listing the same tag twice shouldn't inflate that tag's count.
    const seen = new Set<string>();
    for (const t of p.tags ?? []) {
      const slug = tagSlug(t);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const existing = bySlug.get(slug);
      if (!existing) {
        bySlug.set(slug, {
          slug,
          name: typeof t === "string" ? t : t.name,
          count: 1,
          lastModified: modified,
        });
        continue;
      }
      existing.count += 1;
      if (modified > existing.lastModified) existing.lastModified = modified;
    }
  }
  return [...bySlug.values()];
}

/**
 * Resolve a `/[blog]/tag/[slug]` URL to its label and articles, or null when no
 * published article carries that tag.
 *
 * The single matcher behind the tag route's body, its metadata and its static
 * params. Matching is on `t.slug` only. It used to be `slugify(t.name)`, which
 * held right up until a tag was renamed — the admin keeps the slug fixed across
 * a rename on purpose, so from then on the sitemapped, linked URL 404'd while a
 * URL nothing pointed at quietly worked.
 */
export async function getTagArticles(
  blog: Blog,
  slug: string,
): Promise<{ label: string; articles: Article[] } | null> {
  const articles = await getAllArticles(blog);
  const matches = articles.filter((a) => a.tags.some((t) => t.slug === slug));
  if (matches.length === 0) return null;
  const label =
    matches[0].tags.find((t) => t.slug === slug)?.name ??
    slug.replace(/-/g, " ");
  return { label, articles: matches };
}

/**
 * The footer's phrase rotation, as the site should render it: active entries
 * in the order an admin arranged at /admin/phrases.
 *
 * Returns the built-in fallback list when the backend has nothing to say — the
 * footer is on every page, so "no phrases" must still be a real quote pointing
 * at a real article rather than an empty block.
 */
export async function getPhrases(): Promise<Phrase[]> {
  const response = await api.getPhrases();
  const phrases = (response.data ?? []).map((p) => ({
    quote: p.quote,
    author: p.author,
    article: p.articlePath,
  }));
  return phrases.length > 0 ? phrases : [...FALLBACK_PHRASES];
}
