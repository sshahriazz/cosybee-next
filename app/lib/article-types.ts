// Client-safe article shape shared by the blog UI components. Kept
// free of any server imports so client components can import the type
// without dragging server code into their bundle. The API query layer
// lives in `articles.ts` (server-only).

import { slugify } from "./slug";

export type Author = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  avatarAlt?: string | null;
  avatarWidth?: number | null;
  avatarHeight?: number | null;
  bio: string | null;
  role: string | null;
  email?: string | null;
  website?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  github?: string | null;
};

export type Category = {
  id: string;
  blog: "hive" | "learn";
  name: string;
  slug: string;
  description: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  iconUrl?: string | null;
  /** CSS-token-friendly colour (e.g. `#EE3D1A` or `oklch(...)`). */
  color?: string | null;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

/**
 * The placeholder category `normalizeCategory` invents for a post that is
 * filed under nothing.
 *
 * A display fallback only, never a destination: it gets no filter chip, no
 * landing page and no sitemap entry (see `getCategorySummaries` and
 * `getCategoryArticles`). "Uncategorised" names the *absence* of a category,
 * so offering it as a filter asks the reader to browse by a subject that
 * doesn't exist.
 */
export const UNCATEGORISED_SLUG = "uncategorised";

/**
 * A category with a live landing page, plus what the sitemap needs to describe
 * it. Built server-side by `getCategorySummaries`, but declared here because
 * the chip row and the browse wrapper are client components and `lib/articles`
 * is `server-only`. Client-safe.
 */
export type CategorySummary = {
  slug: string;
  name: string;
  /** Published articles in this blog filed under it. */
  count: number;
  /** Newest article in it — the real "last changed" for the listing. */
  lastModified: Date;
};

/**
 * The one identifier a tag is addressed by — in `/hive/tag/<x>` URLs, in the
 * chips that link to them, and in the sitemap.
 *
 * ALWAYS the stored `slug`, never something re-derived from `name`. The admin
 * deliberately keeps a tag's slug fixed when it is renamed (see TagForm), so
 * `slug` and `slugify(name)` diverge the moment anyone edits a tag — and a page
 * that resolved by name would 404 on the very URL the sitemap advertises.
 *
 * The string branch is the legacy format only, where the API sent a bare tag
 * name and there is no stored slug to honour.
 */
export function tagSlug(tag: Tag | string): string {
  return typeof tag === "string" ? slugify(tag) : tag.slug;
}

export type Article = {
  id: string;
  /** "hive" | "learn" */
  blog: "hive" | "learn";
  slug: string;
  title: string;
  description: string;
  /** Bold subtitle under the H1 (detail view). */
  lede: string | null;

  // SEO
  /** Optional <title>/og:title override; falls back to `title`. */
  seoTitle: string | null;
  /** Optional meta-description override; falls back to `description`. */
  seoDescription: string | null;

  // Taxonomy (full objects from backend)
  author: Author;
  category: Category;
  /** Free-form topic tags. */
  tags: Tag[];

  // Media
  /** Cover image resolved for LISTINGS (cards / carousel): cover → ogImage →
   *  placeholder, so it's always a string. The article hero must NOT use this
   *  — use `coverImageReal`, so a coverless post shows no hero (the og /
   *  placeholder fallback is a listing concern only). */
  coverImage: string;
  /** The post's genuine cover image, or null when it has none — no ogImage or
   *  placeholder fallback. Used by the article hero / detail view. */
  coverImageReal: string | null;
  coverImageAlt: string;
  coverImageTitle: string | null;
  coverImageCaption: string | null;
  coverImageCredit: string | null;

  // SEO / social
  /** 1200×630 social share image; falls back to coverImage if null. */
  ogImage: string | null;
  ogImageAlt: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  /** Server-rendered schema.org Article JSON-LD (detail view only). */
  jsonLd: Record<string, unknown> | null;

  // Display
  /** Read time in minutes (integer). */
  readTime: number;
  /** ISO date string for display (e.g., "January 15, 2024"). */
  authorDate: string;

  // Featured/Carousel
  featured: boolean;
  /** Marks the article for the dedicated featured section on the home page
   *  (independent of `featured`, which drives the blog carousel). */
  homeFeatured: boolean;
  carouselIntro: string | null;
  carouselBody: string | null;

  // CTA (flattened)
  /** Optional end-of-article call-to-action label. */
  ctaLabel: string | null;
  ctaHref: string | null;
  ctaExternal: boolean;

  // Status
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  /** ISO date the article was published. */
  publishedAt: string | null;

  // Content
  contentJson: Record<string, unknown> | null;
  /** Server-rendered article HTML (detail view only). */
  contentHtml: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
};

// Helper type for displaying read time
export function formatReadTime(minutes: number): string {
  return `${minutes} min read`;
}

/**
 * Format an ISO date string for display (e.g. "5 Jun 2026").
 *
 * Rendered in UTC, deliberately. Every caller passes `authorDate`, which is a
 * CALENDAR DATE — "10 August", a day the author picked — stored as midnight
 * UTC because the column holds a timestamp. Formatting that in the reader's
 * timezone rolls it backwards for anyone west of UTC, so an article dated
 * 10 August showed as 9 August in New York and Los Angeles. Pinning to UTC
 * makes every reader see the date the author actually chose.
 *
 * A true instant (`publishedAt`, `updatedAt`) is the opposite case and should
 * be shown in the reader's own zone — don't route those through here.
 */
export function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-GB", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

// NOTE: `isExternalUrl` used to live here and fed `<Image unoptimized>` on every
// article cover, on the premise that "the cross-origin host serves its own
// derivatives". It does not — covers are raw uploads on S3, so the test opted
// every cover out of resizing and AVIF/WebP and shipped ~1MB PNGs into 400px
// cards. Use `unoptimizedFor` from app/lib/image-optimization.ts instead: it
// asks whether the OPTIMIZER can serve the URL, which is the actual question.

/**
 * Articles per page on the blog hubs. Used by both the server (to compute
 * total pages / rel prev-next for crawlable browse pagination) and the client
 * grid (to slice the current page / Load-More step). Client-safe.
 */
export const ARTICLES_PER_PAGE = 12;

/**
 * How many browse pages `total` articles occupy — the single definition of the
 * blog hubs' pagination. The hub pages 404 anything past this, and the sitemap
 * lists exactly this many `?page=` URLs, so the two must not drift: a sitemap
 * computing its own page count would advertise a 404 the day the divisor
 * changes. Always ≥ 1, so an empty blog still has its page 1.
 */
export function browsePageCount(total: number): number {
  return Math.max(1, Math.ceil(total / ARTICLES_PER_PAGE));
}

/**
 * Placeholder cover used by listings (cards, carousel) when a post has no valid
 * cover image. The article hero deliberately skips it — a coverless article
 * shows no hero rather than a stand-in. Client-safe.
 */
export const PLACEHOLDER_COVER = "/bee-flower.png";

/** A valid image URL, or null for a missing / stale-seed (`/images/…`) path. */
export function validImageOrNull(url: string | null | undefined): string | null {
  if (!url) return null;
  // External URLs (API media, https, etc.) are valid.
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Local /images/ paths are seeded placeholder data that likely don't exist.
  if (url.startsWith("/images/")) return null;
  // Other local paths (like /bee-flower.png) are assumed valid.
  return url;
}

/**
 * Resolve the article cover for rendering, falling back in order:
 * cover image → social share image (ogImage) → placeholder. Always returns a
 * string, so consumers (hero, cards, og:image) never see null. Used by both the
 * public article mapper and the admin draft-preview mapper, so they stay in
 * sync. The backend's `coverImage` is nullable (a post can be coverless).
 */
export function resolveCoverImage(
  coverImage: string | null | undefined,
  ogImage: string | null | undefined,
): string {
  return (
    validImageOrNull(coverImage) ?? validImageOrNull(ogImage) ?? PLACEHOLDER_COVER
  );
}

/**
 * The narrowed taxonomy shapes a LISTING card actually renders.
 *
 * A card byline shows an author's name, avatar and profile link — never their
 * bio, role or socials. A category badge needs a label plus the slug its chip
 * filters by. A tag chip needs a label and the slug it links to. Everything
 * else on the full `Author` / `Category` / `Tag` is detail-view or admin data.
 */
export type AuthorRef = Pick<Author, "name" | "slug" | "avatarUrl">;
export type CategoryRef = Pick<Category, "name" | "slug">;
export type TagRef = Pick<Tag, "name" | "slug">;

/**
 * An article as the listing UI consumes it — the hubs' card grid and featured
 * carousel, and every other `ArticleCard` caller.
 *
 * The hubs hand their WHOLE catalogue to a client component (`BlogBrowse`, so
 * search and category filtering happen with no round trip), which means every
 * field of every article is serialised into the RSC payload and shipped to the
 * browser. A full `Article` carries ~35 fields; a card reads twelve. The rest
 * is detail-view and SEO data that no listing ever touches — `jsonLd` alone was
 * 18% of the hub payload and the per-post repeat of the author `bio` another
 * 17%, on a `/hive` navigation that moved 213KB against `/faq`'s 70KB.
 *
 * `Article` stays structurally assignable to this, so a caller already holding
 * full articles can pass them straight through. The hubs go through
 * `toArticleSummary` so the wire only carries what renders.
 */
export type ArticleSummary = Pick<
  Article,
  | "slug"
  | "title"
  | "description"
  | "coverImage"
  | "coverImageAlt"
  | "readTime"
  | "authorDate"
  | "carouselIntro"
  | "carouselBody"
> & {
  author: AuthorRef;
  category: CategoryRef;
  tags: TagRef[];
};

/**
 * Narrow a full article to the fields the listing UI renders.
 *
 * Reads `author` / `category` / `tags` directly rather than defensively: this
 * only ever receives `toArticle` output, whose `normalize*` helpers already
 * guarantee an object for each (a post filed under nothing gets the
 * `UNCATEGORISED_SLUG` placeholder, not a null).
 */
export function toArticleSummary(a: Article): ArticleSummary {
  return {
    slug: a.slug,
    title: a.title,
    description: a.description,
    coverImage: a.coverImage,
    coverImageAlt: a.coverImageAlt,
    readTime: a.readTime,
    authorDate: a.authorDate,
    carouselIntro: a.carouselIntro,
    carouselBody: a.carouselBody,
    author: {
      name: a.author.name,
      slug: a.author.slug,
      avatarUrl: a.author.avatarUrl,
    },
    category: { name: a.category.name, slug: a.category.slug },
    tags: a.tags.map((t) => ({ name: t.name, slug: t.slug })),
  };
}
