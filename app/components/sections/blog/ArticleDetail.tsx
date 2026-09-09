import Image from "next/image";
import Link from "next/link";
import {
  type Article,
  formatDate,
  formatReadTime,
  UNCATEGORISED_SLUG,
} from "@/app/lib/article-types";
import {
  optimizeArticleImages,
  unoptimizedFor,
} from "@/app/lib/image-optimization";
import { buildToc, wrapArticleTables } from "@/app/lib/toc";
import { renderArticleBody } from "@/app/lib/article-body";
import { stripPastedColors } from "@/app/lib/blocknote";
import { collectFaqItems } from "@/app/lib/blocknoteSchema";
import { ArticleCard } from "./ArticleCard";
import { MoreArticlesCard } from "./MoreArticlesCard";
import { CtaButton } from "@/app/components/ui/Cta";
import Dot from "@/app/components/ui/Dot";
import Avatar from "@/app/components/ui/Avatar";
import ShareButton from "./ShareButton";
import ReadingProgress from "./ReadingProgress";
import ArticleToc from "./ArticleToc";
import JsonLd from "@/app/components/JsonLd";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import {
  articleSchema,
  breadcrumbSchema,
  faqPageSchema,
  videoObjectSchema,
} from "@/app/lib/structured-data";
import { resolveArticleVideos } from "@/app/lib/article-videos";
import { inter } from "@/app/lib/fonts";

type Props = {
  /** Published article with rendered body HTML (caller handles notFound). */
  article: Article;
  related: Article[];
  /** Link base, e.g. "/hive" or "/learn". */
  basePath: string;
};

/**
 * NewsNow locates an article's body and its author by literal HTML comments in
 * the served markup — `<!-- Article Start -->` / `<!-- Article End -->` around
 * the content, `<!-- Author Start -->` / `<!-- Author End -->` around the name.
 *
 * They have to be injected as raw HTML. A JSX comment is a JavaScript
 * construct and never reaches the DOM, and React cannot render a bare comment
 * node — so a marker written the obvious way would sit in the source and be
 * absent from the page, which is precisely the failure this guards against.
 */
const ARTICLE_START = "<!-- Article Start -->";
const ARTICLE_END = "<!-- Article End -->";

/** Minimal escaping for text interpolated into a raw-HTML string. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * The author's name, bracketed by NewsNow's author markers.
 *
 * A `<span>` is unavoidable: the comments can only be produced through
 * `dangerouslySetInnerHTML`, which needs a host element. It carries no styling,
 * so the byline is unchanged visually. The name is escaped because it is
 * author-supplied data being placed into raw HTML.
 */
function MarkedAuthorName({ name }: { name: string }) {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: `<!-- Author Start -->${escapeHtml(name)}<!-- Author End -->`,
      }}
    />
  );
}

/**
 * Renders a full blog article — breadcrumb trail, header/meta, hero image,
 * lede, block body (paragraphs + lists, with auto-linked URLs),
 * optional inline image and end-of-article CTA, plus a related rail.
 * Shared by /hive and /learn article routes.
 */
export default async function ArticleDetail({
  article,
  related,
  basePath,
}: Props) {
  // Resolve the article body — BlockNote `contentJson` first, then the legacy
  // shape, then the backend's stored HTML. Shared with the SmartNews feed's
  // `content:encoded` (see lib/article-body.ts) so the syndicated copy cannot
  // come from a different source than the page.
  const rawHtml = await renderArticleBody(article);
  // Post-process the rendered body regardless of which source produced it:
  // heading ids for the TOC, a scroll wrapper around each table, and — for the
  // stored-`contentHtml` fallback, which may predate the export-side pass —
  // the pasted-in colours that would otherwise outrank `--article-foreground`.
  const { html: tocHtml, items: toc } = buildToc(
    wrapArticleTables(stripPastedColors(rawHtml)),
  );
  // Route the body's <img> tags through the image optimizer. It runs LAST
  // because the passes above walk tags with broad `<[^>]*>` patterns and have
  // no need to scan the `srcset` this adds. Done at render rather than at
  // publish so the whole archive benefits without a re-save, and so
  // `contentHtml` stays a faithful record of what was authored.
  const html = optimizeArticleImages(tocHtml);
  // The sidebar "On this page" outline lists top-level sections (h2) only.
  // Anchors and the in-article /toc block still cover h3 subsections.
  const sidebarToc = toc.filter((item) => item.level === 2);
  const path = `${basePath}/${article.slug}`;
  // Videos embedded in the body, described for Google Video. Read from
  // `contentJson` (the authored document), so adding or removing a video in
  // the editor is the only step — the markup below follows on the next render.
  // Empty for the vast majority of articles, which then emit no video markup
  // at all rather than an empty node.
  const videos = resolveArticleVideos(article);
  // FAQ blocks in the body, described as a FAQPage. Read from the same blocks
  // that render the visible accordion, so the markup cannot drift from what a
  // reader sees — which is Google's condition for showing it at all.
  const faqs = collectFaqItems(article.contentJson);
  const blogLabel = basePath === "/hive" ? "The Hive" : "Learn";

  // Link the category only when it has a landing page. `normalizeCategory`
  // invents one — id "", name "Uncategorised" — for posts that have none, and
  // for the legacy string format, and `/[blog]/category/[slug]` calls notFound()
  // for a slug it can't resolve. A non-empty id is what separates a row that has
  // a landing page from a placeholder that would link straight to a 404.
  //
  // The slug is checked as well as the id, because "uncategorised" now 404s
  // whichever way it arrives: `getCategoryArticles` refuses it outright, so even
  // a real stored row named that has no page to point at.
  const categoryHref =
    article.category?.id &&
    article.category.slug &&
    article.category.slug !== UNCATEGORISED_SLUG
      ? `${basePath}/category/${article.category.slug}`
      : null;

  // The category sits between the blog and the article, mirroring the URL.
  // `crumbs` also feeds the BreadcrumbList JSON-LD below, so the structured
  // trail and the visible one cannot disagree — which is the whole point of
  // building them from one array.
  const crumbs = [
    { name: "Home", path: "/" },
    { name: blogLabel, path: basePath },
    ...(categoryHref && article.category?.name
      ? [{ name: article.category.name, path: categoryHref }]
      : []),
    { name: article.title, path },
  ];

  return (
    /* `inter.variable` defines --font-inter on this element; `.article-page`
       is what consumes it (globals.css). Declaring the font in this component
       rather than the root layout is what keeps it scoped: Next preloads Inter
       only on the routes that render an article. */
    <main className={`${inter.variable} article-page flex-1`}>
      {/* Warm up the connection to the media host — article images load from
          it cross-origin (React 19 hoists this to <head> and dedups it). */}
      <link rel="preconnect" href="https://eb-api.technext.it" />
      {/* The backend-rendered Article schema merged over the locally-built one
          — the backend owns the post's content, this side fills in the
          site-level identity it has no way to know (publisher, url) and pins
          the type. See `articleSchema`. Breadcrumb schema is always our own
          concern. */}
      <JsonLd
        data={[
          articleSchema(article, path),
          breadcrumbSchema(crumbs),
          // One VideoObject per embedded video — omitted entirely when the
          // article has none.
          ...videos.map((video) => videoObjectSchema(video, path)),
          // Omitted entirely unless the article actually has Q&A blocks.
          ...(faqs.length ? [faqPageSchema(faqs)] : []),
        ]}
      />
      <ReadingProgress targetSelector="#post" />
      {/* px-0 + xl:px-6 override the blog gutter: below xl the article body
          carries its own padding. */}
      <Container size="blog" className="flex justify-center gap-10 ">
        {/* `id="post"`, not `article-body`: this element spans the whole post
            — breadcrumb, header, hero, body, CTA — while `.article-body`
            below is the prose alone. Sharing one name made it easy to read
            the two as the same region, and only the inner one is the article
            as NewsNow (or any extractor) should see it. */}
        <article
          id="post"
          className="w-full max-w-225 px-6 pt-10 pb-16 sm:px-5 xl:px-0 lg:pt-18.5 lg:pb-20"
        >
          {/* breadcrumb trail (replaces the old "Back to Blog" button) */}
          <Breadcrumbs items={crumbs} />

          {/* title + meta */}
          <header className="mt-4 lg:mt-7">
            <h1 className="text-[24px] leading-[110%] font-bold text-foreground sm:text-[36px]">
              {article.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              {/* Clickable when the category has a landing page; a plain chip
                  otherwise, so a placeholder category never becomes a dead
                  link. Hover mirrors the tag chips below it. */}
              {categoryHref ? (
                <Link
                  href={categoryHref}
                  className="inline-flex items-center rounded-full border border-border bg-[#EBF2F5] px-1.5 py-[2.5px] text-xs font-semibold transition-colors hover:bg-[#E6EEF1] hover:text-[#1b4a5e]"
                >
                  {article.category.name}
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-full border border-border bg-[#EBF2F5] px-1.5 py-[2.5px] text-xs font-semibold">
                  {article.category?.name ?? "Uncategorised"}
                </span>
              )}
              <Dot />
              <span className="text-muted">
                {formatReadTime(article.readTime)}
              </span>
            </div>
            {article.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`${basePath}/tag/${tag.slug}`}
                    className="inline-flex items-center rounded-full bg-[#F3F3F3] px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-[#E6EEF1] hover:text-[#1b4a5e]"
                  >
                    {`#${tag.name}`}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Same destination as the name link below it. Hidden from
                    assistive tech and tab order so the author profile isn't
                    announced twice — the name link carries it. */}
                {article.author?.slug ? (
                  <Link
                    href={`/author/${article.author.slug}`}
                    aria-hidden
                    tabIndex={-1}
                    className="shrink-0 rounded-full transition-opacity hover:opacity-80"
                  >
                    <Avatar
                      name={article.author.name}
                      avatarUrl={article.author.avatarUrl}
                    />
                  </Link>
                ) : (
                  <Avatar
                    name={article.author?.name ?? "energiebee"}
                    avatarUrl={article.author?.avatarUrl}
                  />
                )}
                <div className="text-sm">
                  {article.author?.slug ? (
                    <Link
                      href={`/author/${article.author.slug}`}
                      className="font-bold text-lg text-foreground transition-colors hover:text-[#FF8A7A]"
                    >
                      <MarkedAuthorName name={article.author.name} />
                    </Link>
                  ) : (
                    <div className="font-bold text-lg text-foreground">
                      <MarkedAuthorName
                        name={article.author?.name ?? "energiebee"}
                      />
                    </div>
                  )}
                  <time
                    dateTime={article.publishedAt ?? article.authorDate}
                    className="block text-muted text-[15px] mt-1 font-medium"
                  >
                    {formatDate(article.authorDate)}
                  </time>
                </div>
              </div>
              <ShareButton title={article.title} />
            </div>
          </header>

          {/* hero image — wrapped as <figure> so any caption/credit the
              author entered renders semantically with the image. Uses the
              GENUINE cover (`coverImageReal`): a coverless post shows no hero,
              never the listing og/placeholder fallback. */}
          {article.coverImageReal && (
            <figure className="mt-10">
              <div
                {...(article.coverImageTitle
                  ? { title: article.coverImageTitle }
                  : {})}
                className="relative aspect-video overflow-hidden rounded-3xl sm:aspect-video"
              >
                <Image
                  src={article.coverImageReal}
                  alt={article.coverImageAlt}
                  fill
                  priority
                  sizes="(min-width: 800px) 800px, 100vw"
                  className="object-cover"
                  unoptimized={unoptimizedFor(article.coverImageReal)}
                />
              </div>
              {(article.coverImageCaption || article.coverImageCredit) && (
                <figcaption className="mt-3 px-2 text-sm text-[#545454] sm:px-0">
                  {article.coverImageCaption && (
                    <span>{article.coverImageCaption}</span>
                  )}
                  {article.coverImageCaption && article.coverImageCredit && (
                    <span aria-hidden> · </span>
                  )}
                  {article.coverImageCredit && (
                    <span className="text-[#787878]">
                      {article.coverImageCredit}
                    </span>
                  )}
                </figcaption>
              )}
            </figure>
          )}

          {/* lede / subtitle */}
          {article.lede && (
            <p className="mt-10 text-lg font-bold leading-snug hidden text-foreground sm:text-xl">
              {article.lede}
            </p>
          )}

          {/* Body — server-rendered HTML from the BlockNote document, wrapped
              in NewsNow's article markers. They go INSIDE this div, hugging the
              prose itself: the <article> element around it also carries the
              breadcrumb, byline and share control, none of which are the
              article. */}
          <div
            className="article-body mt-10 max-w-170 mx-auto wrap-break-word [&_a]:break-all"
            dangerouslySetInnerHTML={{
              __html: `${ARTICLE_START}${html}${ARTICLE_END}`,
            }}
          />

          {/* end-of-article CTA */}
          {article.ctaLabel && article.ctaHref && (
            <div className="mt-12 flex justify-center px-10 lg:px-20">
              <CtaButton
                href={article.ctaHref}
                external={article.ctaExternal}
                size="md"
                className="text-lg!"
              >
                {article.ctaLabel}
              </CtaButton>
            </div>
          )}
        </article>

        {(sidebarToc.length > 1 || related.length > 0) && (
          // The whole sidebar is sticky: `self-start` keeps it content-height
          // (a stretched flex item can't stick), and max-height + overflow let
          // it scroll internally when the TOC + cards exceed the viewport.
          <aside className="sticky top-24 mt-18 hidden max-h-full w-100 shrink-0 flex-col gap-10 self-start overflow-y-auto px-5 -mx-5 pb-8 xl:flex scrollbar-overlay">
            {/* sticky={false}: the aside already pins it. */}
            {sidebarToc.length > 1 && (
              <ArticleToc items={sidebarToc} sticky={false} />
            )}

            {related.length > 0 && (
              <div>
                <h3 className="text-lg font-extrabold text-foreground">
                  More blogs
                </h3>
                <div className="mt-4 flex flex-col gap-1">
                  {related.map((a) => (
                    <MoreArticlesCard key={a.slug} a={a} basePath={basePath} />
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </Container>
      {/* more blogs */}
      {related.length > 0 && (
        <Section
          spacing="none"
          overflow="visible"
          className="xl:has-last:hidden"
        >
          <Container size="prose" className="pb-16 sm:px-5 lg:pb-24">
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
              More blogs
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {related.map((a) => (
                <ArticleCard key={a.slug} a={a} basePath={basePath} />
              ))}
            </div>
          </Container>
        </Section>
      )}
    </main>
  );
}
