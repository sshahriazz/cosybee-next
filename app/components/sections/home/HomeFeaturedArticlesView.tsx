"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@heroui/react";
import { AppLink as Link } from "@/app/components/ui/AppLink";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import type { Article } from "@/app/lib/article-types";
import { ArticleCard } from "@/app/components/sections/blog/ArticleCard";
import DecorHex from "@/app/components/ui/DecorHex";

/** Per-article blog hub path (articles span both blogs on the home page). */
function basePathFor(a: Article): string {
  return `/${a.blog}`;
}

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/** Heading + "View all blog" pill, shared by the grid and carousel layouts. */
function Header({ viewAllHref }: { viewAllHref: string }) {
  return (
    <div className="relative flex items-center justify-between gap-4 z-10">
      <h2 className="text-2xl font-bold text-foreground sm:text-[32px]">
        Featured articles
      </h2>
      <Link
        href={viewAllHref}
        className="shrink-0 bg-[#f7f7f7f7] h-11 flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-tertiary sm:text-base leading-[100%]"
      >
        View all articles
      </Link>
    </div>
  );
}

/** Column count that stays balanced for 1–4 cards (no orphan rows). */
const GRID_COLS: Record<number, string> = {
  1: "max-w-md grid-cols-1",
  2: "max-w-3xl grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

/** Static responsive grid — used when there are 1–4 featured articles. */
function FeaturedGrid({ articles }: { articles: Article[] }) {
  return (
    <div
      className={`mt-8 mb-6 grid gap-6 ${GRID_COLS[articles.length] ?? GRID_COLS[4]}`}
    >
      {articles.map((a) => (
        <ArticleCard
          key={`${a.blog}/${a.slug}`}
          a={a}
          basePath={basePathFor(a)}
        />
      ))}
    </div>
  );
}

/**
 * Embla carousel — used when there are more than 4 featured articles. Shows
 * 1 / 2 / 3 cards per view (mobile / tablet / desktop) with dot pagination
 * and prev/next arrows. The negative-margin + per-slide padding pattern gives
 * a consistent 24px gutter with the first card flush to the viewport edge.
 */
function FeaturedCarousel({ articles }: { articles: Article[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  const goTo = useCallback((i: number) => emblaApi?.goTo(i), [emblaApi]);
  const goPrev = useCallback(() => emblaApi?.goToPrev(), [emblaApi]);
  const goNext = useCallback(() => emblaApi?.goToNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedSnap());
      setSnapCount(emblaApi.snapList().length);
    };
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reinit", onSelect);
  }, [emblaApi]);

  const atStart = selectedIndex === 0;
  const atEnd = selectedIndex >= snapCount - 1;

  return (
    <>
      {/* Clip horizontally to hide off-screen slides, but keep the vertical
          axis visible so the cards' drop shadows aren't sheared off. The
          horizontal px (matched by -mx) pushes the clip boundary out by one
          gutter so the first/last cards' side shadows have room without any
          adjacent slide peeking in; py gives the vertical shadow breathing
          space before the pagination row. */}

      <div
        className="mt-8 -mx-5 overflow-x-clip overflow-y-visible px-5 py-2"
        ref={emblaRef}
      >
        <div className="-ml-6 flex touch-pan-y">
          {articles.map((a) => (
            <div
              key={`${a.blog}/${a.slug}`}
              className="min-w-0 flex-[0_0_100%] pl-6 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
              role="group"
              aria-roledescription="slide"
            >
              <ArticleCard a={a} basePath={basePathFor(a)} />
            </div>
          ))}
        </div>
      </div>

      {/* pagination row — dots centred, arrows right */}
      <div className="relative mt-8 flex h-13 items-center justify-between">
        <div className="flex flex-1 items-center md:justify-center">
          <div
            className="flex items-center gap-2 px-2"
            role="tablist"
            aria-label="Featured articles pages"
          >
            {Array.from({ length: snapCount }).map((_, i) => {
              const isActive = i === selectedIndex;
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Go to page ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full transition-all ${
                    isActive
                      ? "w-2 bg-black"
                      : "w-2 bg-[#1F1F1F29] hover:bg-neutral-400"
                  }`}
                />
              );
            })}
          </div>
        </div>
        <div className="absolute right-0 flex items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            aria-label="Previous articles"
            onPress={goPrev}
            isDisabled={atStart}
            className="flex h-13 w-13 items-center justify-center rounded-2xl border border-border bg-surface text-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.03),0_4px_10px_0_rgba(0,0,0,0.06)] transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft />
          </Button>
          <Button
            isIconOnly
            variant="tertiary"
            aria-label="Next articles"
            onPress={goNext}
            isDisabled={atEnd}
            className="flex h-13 w-13 items-center justify-center rounded-2xl border border-border bg-surface text-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.03),0_4px_10px_0_rgba(0,0,0,0.06)] transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * Home-page "Featured blog articles" section. Renders a responsive grid for
 * up to 4 articles, or a paginated carousel beyond that. Returns null for an
 * empty set (the server wrapper also guards this).
 */
export function HomeFeaturedArticlesView({
  articles,
  viewAllHref,
}: {
  articles: Article[];
  viewAllHref: string;
}) {
  if (articles.length === 0) return null;

  return (
    <Section spacing="none" className="bg-linear-to-b from-white to-base">
      <Container className="pt-12 pb-2">
        <Header viewAllHref={viewAllHref} />
        <DecorHex side="right" className="top-6" />
        {articles.length > 3 ? (
          <FeaturedCarousel articles={articles} />
        ) : (
          <FeaturedGrid articles={articles} />
        )}
      </Container>
    </Section>
  );
}
