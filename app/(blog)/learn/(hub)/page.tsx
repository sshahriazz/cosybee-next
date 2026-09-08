import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogHero from "@/app/components/sections/blog/BlogHero";
import BlogBrowse from "@/app/components/sections/blog/BlogBrowse";
import {
  getArticleSummaries,
  getFeaturedSummaries,
  getCategorySummaries,
} from "@/app/lib/articles";
import { browsePageCount } from "@/app/lib/article-types";
import JsonLd from "@/app/components/JsonLd";
import {
  breadcrumbSchema,
  collectionPageSchema,
} from "@/app/lib/structured-data";
import { url } from "@/app/lib/site";
import { pageMetadata } from "@/app/lib/seo";
import { hubIndexing, resolveCategorySlug } from "@/app/lib/blog-hub";
import CategoryChips from "@/app/components/sections/blog/CategoryChips";
import learnCover from "@/public/Cover/energiebee-learn-cover.png";
import learnCoverMobile from "@/public/Cover/energiebee-learn-cover-mobile.png";

const LEARN_DESCRIPTION =
  "Guides, tutorials, and energy-saving tips from the EnergieBee team.";

/** First value of a search param (handles the string | string[] shape). */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse a `?page=` value to a page number ≥ 1. */
function parsePage(value: string | string[] | undefined): number {
  const n = Number(firstParam(value));
  return Number.isInteger(n) && n > 1 ? n : 1;
}

export async function generateMetadata({
  searchParams,
}: PageProps<"/learn">): Promise<Metadata> {
  const sp = await searchParams;
  const categories = await getCategorySummaries("learn");
  // See hubIndexing for the three cases and why each declares what it does.
  const { path, index } = hubIndexing({
    base: "/learn",
    query: firstParam(sp.q)?.trim() ?? "",
    categorySlug: resolveCategorySlug(categories, firstParam(sp.category)),
    tag: firstParam(sp.tag) ?? "",
    page: parsePage(sp.page),
  });
  return pageMetadata({
    title: "Learn",
    description: LEARN_DESCRIPTION,
    path,
    index,
  });
}

export default async function LearnPage({ searchParams }: PageProps<"/learn">) {
  const sp = await searchParams;
  const page = parsePage(sp.page);

  // Narrowed to the listing shape: all three land in `BlogBrowse`, a client
  // component, so anything kept here is serialised into the RSC payload and
  // shipped to the browser. See `ArticleSummary`.
  const [articles, featured, categories] = await Promise.all([
    getArticleSummaries("learn"),
    getFeaturedSummaries("learn"),
    getCategorySummaries("learn"),
  ]);

  const categorySlug = resolveCategorySlug(categories, firstParam(sp.category));
  const filtered = Boolean(
    firstParam(sp.q) || categorySlug || firstParam(sp.tag),
  );

  const totalPages = browsePageCount(articles.length);
  // Out-of-range browse page → the not-found page rather than a thin, empty
  // one. NOTE: this streams as HTTP 200 + `noindex`, NOT a hard 404. The
  // sibling loading.tsx opens the response before this check can run, and a
  // status cannot be changed once headers are sent. That is survivable here
  // and nowhere else in this segment: nothing links these URLs (the pagination
  // stops at `totalPages` and the sitemap lists exactly that many), and the
  // `noindex` keeps them out of the index — a crawler may still log a soft
  // 404. The article/tag/category routes below keep their hard 404s, which is
  // why the loading boundary is scoped to the (hub) group instead of sitting
  // at the segment root where it would cover them too.
  if (!filtered && page > totalPages) notFound();

  return (
    <main className="flex-1">
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Learn", path: "/learn" },
          ]),
          collectionPageSchema({
            name: "Learn — EnergieBee",
            description: LEARN_DESCRIPTION,
            path: "/learn",
            items: articles.map((a) => ({
              title: a.title,
              path: `/learn/${a.slug}`,
            })),
          }),
        ]}
      />
      {/* Crawlable prev/next hints for the browse pagination (React 19 hoists
          these to <head>). Omitted in filter/search mode. */}
      {!filtered && page > 1 && (
        <link
          rel="prev"
          href={url(page === 2 ? "/learn" : `/learn?page=${page - 1}`)}
        />
      )}
      {!filtered && page < totalPages && (
        <link rel="next" href={url(`/learn?page=${page + 1}`)} />
      )}
      <BlogHero
        title="Learn"
        description={LEARN_DESCRIPTION}
        bgImage={learnCover}
        bgImageMobile={learnCoverMobile}
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Learn", path: "/learn" },
        ]}
      />
      <BlogBrowse
        articles={articles}
        featured={featured}
        categories={categories}
        basePath="/learn"
        initialQuery={firstParam(sp.q) ?? ""}
        initialCategory={categorySlug}
        initialTag={firstParam(sp.tag) ?? ""}
        page={page}
      />
      {/* The crawl path to the category pages.
          The chips inside BlogBrowse are buttons — they filter the grid in
          place, which is what keeps the hub feeling instant, but a button
          leaves nothing in the HTML for a crawler to follow. These are real
          links to the same categories, so the pages are reachable by Google and
          by anyone browsing with JS off. Removing this section orphans every
          category page: the sitemap would list URLs nothing on the site links,
          which is how a URL ends up "unknown to Google". */}
      <section
        aria-hidden
        className="mx-auto hidden w-full max-w-360 px-6 pb-16 sm:px-10 lg:px-30"
      >
        <h2 className="text-lg font-bold tracking-[0.08em] text-foreground">
          BROWSE BY CATEGORY
        </h2>
        <CategoryChips
          categories={categories}
          basePath="/learn"
          activeSlug={categorySlug || null}
          className="mt-4"
        />
      </section>
    </main>
  );
}
