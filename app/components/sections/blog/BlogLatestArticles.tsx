"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ArticleSummary,
  ARTICLES_PER_PAGE,
} from "@/app/lib/article-types";
import { Section } from "@/app/components/ui/Section";
import Pagination from "@/app/components/ui/Pagination";
import { Button } from "@heroui/react";
import { ArticleCard } from "./ArticleCard";

const LOAD_STEP = 6;

/** Derive the section heading from the active filter, if any. */
function deriveHeading(
  query: string,
  categoryLabel: string,
  tag: string,
): string {
  const q = query.trim();
  if (q) return `Results for "${q}"`;
  if (tag) return `#${tag}`;
  if (categoryLabel) return categoryLabel;
  return "Latest Articles";
}

type Props = {
  /** The full article set; filtering/pagination happens here on the client. */
  articles: ArticleSummary[];
  basePath: string;
  query?: string;
  /** Active category *slug*; "" means All. Matches `article.category.slug`. */
  category?: string;
  /** Display name for the active category — heading copy only. */
  categoryLabel?: string;
  tag?: string;
  /** Current browse page (1-based). Only used when no filter is active. */
  page?: number;
  /** Change the browse page (client-side; owner mirrors it to the URL). */
  onPageChange?: (page: number) => void;
  /** Whether the featured carousel is visible directly above this section.
   *  When true the top padding collapses so the heading tucks under it; when
   *  the carousel is hidden (no featured, page > 1, or filtering) the normal
   *  top padding is kept so the section isn't flush against what's above. */
  showFeatured?: boolean;
};

/**
 * "Latest Articles" — heading + 3-column responsive grid of article cards.
 *
 * Two mutually-exclusive modes:
 * - **Browse** (no query/category/tag): shows page `page` of all articles with
 *   crawlable numbered <Pagination> (real ?page=N links → every article is
 *   reachable by search engines).
 * - **Filter/search**: filters the full set client-side and reveals results
 *   with Load More. This view is shareable (URL synced by the parent) but
 *   noindex, so pagination crawlability doesn't matter here.
 */
export default function BlogLatestArticles({
  articles,
  basePath,
  query = "",
  category = "",
  categoryLabel = "",
  tag = "",
  page = 1,
  onPageChange,
  showFeatured = false,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFiltered = query.trim() !== "" || category !== "" || tag !== "";
  const [visible, setVisible] = useState(ARTICLES_PER_PAGE);

  // Reset the Load-More reveal whenever the active filter changes — React's
  // "adjust state during render" pattern (no effect, no extra render pass).
  const filterKey = `${query}|${category}|${tag}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisible(ARTICLES_PER_PAGE);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Matching is inlined (not a module-level helper) — the React Compiler
    // instruments standalone functions with their own memo cache, and calling
    // one inside `.filter` (a render-time loop) throws a useMemoCache size
    // mismatch. See the react-compiler-helper-gotcha note.
    return articles.filter((a) => {
      // Matched on slug, not name: the slug is what the URL carries and what
      // /[blog]/category/[slug] resolves, so both views select the same set.
      if (category && a.category?.slug !== category) return false;
      if (tag && !a.tags.some((t) => t.name === tag)) return false;
      if (!q) return true;
      const haystack =
        `${a.title} ${a.description} ${a.author?.name ?? ""} ${a.category?.name ?? ""} ${a.tags
          .map((t) => t.name)
          .join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [articles, query, category, tag]);

  // Browse mode → slice to the current page; filter mode → Load-More reveal.
  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / ARTICLES_PER_PAGE),
  );
  const shown = isFiltered
    ? filtered.slice(0, visible)
    : filtered.slice((page - 1) * ARTICLES_PER_PAGE, page * ARTICLES_PER_PAGE);
  const canLoadMore = isFiltered && visible < filtered.length;

  const heading = deriveHeading(query, categoryLabel, tag);

  // Scroll the heading into view after a page change — deferred to an effect
  // (not run inline in the click handler) so it fires AFTER React commits the
  // new layout. This matters because the parent renders the featured carousel
  // only on page 1, so paging across the page-1 boundary mounts/unmounts that
  // block above this section; scrolling synchronously would target the stale
  // pre-shift position and overshoot.
  //
  // Guard on the page VALUE changing, not on mount timing: a mount ref gets
  // flipped by React Strict Mode's setup→cleanup→setup double-invoke in dev,
  // which then scrolls on first load. Seeding the ref with the current page
  // means the initial mount (and any remount at the same page) is a no-op, and
  // only a genuine page change scrolls.
  const scrolledPageRef = useRef(page);
  useEffect(() => {
    if (scrolledPageRef.current === page) return;
    scrolledPageRef.current = page;
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  function handlePageChange(p: number) {
    onPageChange?.(p);
  }

  return (
    <Section
      spacing="none"
      className={`mx-auto max-w-360 px-6 py-6 sm:px-10 lg:px-30 lg:py-8 ${showFeatured ? "pt-0 lg:pt-0" : ""} `}
    >
      <h2
        ref={headingRef}
        className="scroll-mt-28 text-2xl font-bold text-foreground sm:text-[32px]"
      >
        {heading}
      </h2>
      {filtered.length === 0 ? (
        <p className="mt-8 text-base text-muted">
          No articles match your search. Try a different keyword or category.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 lg:gap-6">
          {shown.map((a) => (
            <ArticleCard key={a.slug} a={a} basePath={basePath} />
          ))}
        </div>
      )}
      {canLoadMore && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="tertiary"
            onPress={() =>
              setVisible((v) => Math.min(v + LOAD_STEP, filtered.length))
            }
            className="rounded-[9px] bg-surface-secondary px-8 py-3 text-lg font-bold text-foreground transition-colors hover:bg-surface-tertiary"
          >
            Load More
          </Button>
        </div>
      )}
      {!isFiltered && (
        <div className="mt-12">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </Section>
  );
}
