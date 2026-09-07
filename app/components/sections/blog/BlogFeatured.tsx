"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import Avatar from "@/app/components/ui/Avatar";
import { AppLink as Link } from "@/app/components/ui/AppLink";
import { CtaButton } from "@/app/components/ui/Cta";
import { Section } from "@/app/components/ui/Section";
import {
  type Article,
  formatDate,
  formatReadTime,
} from "@/app/lib/article-types";
import { unoptimizedFor } from "@/app/lib/image-optimization";
import Dot from "@/app/components/ui/Dot";
import { Button } from "@heroui/react";

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-5 w-5 ${className}`}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-5 w-5 ${className}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function Slide({
  slide,
  basePath,
  priority,
}: {
  slide: Article;
  basePath: string;
  priority: boolean;
}) {
  const authorName = slide.author?.name ?? "energiebee";
  // Null for authors with no slug — there's no profile page to link to.
  const authorHref = slide.author?.slug
    ? `/author/${slide.author.slug}`
    : null;
  return (
    <article className="grid h-full grid-cols-1 overflow-hidden lg:grid-cols-[1fr_1fr]">
      <div className="relative aspect-4/3 lg:aspect-auto lg:h-full">
        <Image
          src={slide.coverImage}
          alt={slide.coverImageAlt}
          fill
          sizes="(min-width: 1024px) 600px, 100vw"
          className="object-cover"
          priority={priority}
          unoptimized={unoptimizedFor(slide.coverImage)}
        />
      </div>
      <div className="flex flex-col h-full p-8 sm:p-10">
        <div className="flex items-center gap-4 text-base">
          <span className="font-semibold text-[#EE3D1A]">
            {slide.category?.name ?? "Uncategorised"}
          </span>
          <Dot />
          <span className="text-muted text-[15px] font-medium">
            {formatReadTime(slide.readTime)}
          </span>
        </div>
        <h2 className="text-2xl line-clamp-3 tracking-[-0.03em] font-extrabold text-foreground sm:text-3xl lg:text-[30px] mt-3">
          <Link
            title={slide.title}
            href={`${basePath}/${slide.slug}`}
            className="underline-offset-4 hover:underline"
          >
            {slide.title}
          </Link>
        </h2>
        {slide.carouselIntro && (
          <p className="text-muted mt-4">{slide.carouselIntro}</p>
        )}
        {slide.carouselBody && (
          <p className="text-base text-muted mt-4 line-clamp-3">
            {slide.carouselBody}
          </p>
        )}
        {slide.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {slide.tags.slice(0, 3).map((t) => (
              <Link
                key={t.id}
                href={`${basePath}/tag/${t.slug}`}
                className="inline-flex items-center rounded-full bg-[#F3F3F3] px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-[#E6EEF1] hover:text-[#1b4a5e]"
              >
                {`#${t.name}`}
              </Link>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-auto pt-4">
          {/* Same destination as the name link beside it — hidden from
              assistive tech and tab order so the profile isn't announced
              twice. */}
          {authorHref ? (
            <Link
              href={authorHref}
              aria-hidden
              tabIndex={-1}
              className="shrink-0 rounded-full transition-opacity hover:opacity-80"
            >
              <Avatar name={authorName} avatarUrl={slide.author?.avatarUrl} />
            </Link>
          ) : (
            <Avatar name={authorName} avatarUrl={slide.author?.avatarUrl} />
          )}
          <div className="text-base">
            {authorHref ? (
              <Link
                href={authorHref}
                className="font-bold text-foreground text-lg transition-colors hover:text-[#FF8A7A]"
              >
                {authorName}
              </Link>
            ) : (
              <div className="font-bold text-foreground text-lg">
                {authorName}
              </div>
            )}
            <div className="text-muted mt-1 font-medium text-[15px]">
              {formatDate(slide.authorDate)}
            </div>
          </div>
        </div>
        <CtaButton
          href={`${basePath}/${slide.slug}`}
          size="md"
          className="mt-8 w-full text-lg! h-13.25!"
        >
          Read article
        </CtaButton>
      </div>
    </article>
  );
}

/**
 * Featured-article carousel powered by Embla Carousel v9. Slides are
 * passed in (articles flagged with `carouselIntro` / `carouselBody`)
 * along with the link `basePath` (e.g. "/hive" or "/learn"). Supports
 * drag/swipe, arrows, and clickable dots wired to the Embla API.
 *
 * Note: useEmblaCarousel returns a 3-tuple in v9 — [rootRef, api, apiSync].
 * The 2nd element is `undefined` until the carousel mounts, so calls
 * naturally no-op pre-mount via optional chaining.
 */
export default function BlogFeatured({
  slides,
  basePath,
}: {
  slides: Article[];
  basePath: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.goToPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.goToNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.goTo(i), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reinit", onSelect);
  }, [emblaApi]);

  if (slides.length === 0) return null;

  return (
    <Section
      spacing="none"
      className="mx-auto max-w-360 px-6 py-12 sm:px-10 lg:px-30"
    >
      {/* embla viewport */}
      <div
        className="overflow-hidden border border-border rounded-3xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]"
        ref={emblaRef}
      >
        <div className="flex touch-pan-y">
          {slides.map((s, i) => (
            <div
              key={s.slug}
              className="min-w-0 flex-[0_0_100%]"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
            >
              <Slide slide={s} basePath={basePath} priority={i === 0} />
            </div>
          ))}
        </div>
      </div>

      {/* pagination row */}
      <div className="mt-8 relative h-13 flex items-center justify-between">
        <div className="flex-1 flex items-center md:justify-center">
          <div
            className="flex items-center gap-2 px-2"
            role="tablist"
            aria-label="Featured article slides"
          >
            {slides.map((s, i) => {
              const isActive = i === selectedIndex;
              return (
                <button
                  key={s.slug}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => scrollTo(i)}
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
        <div className="flex absolute right-0 items-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            aria-label="Previous slide"
            onPress={scrollPrev}
            className="flex h-13 w-13 items-center justify-center rounded-2xl border border-border bg-surface text-foreground shadow-[0_2.88px_5.32px_0_rgba(0,0,0,0.02),0_12.58px_17.87px_0_rgba(0,0,0,0.04),0_24px_40px_0_rgba(0,0,0,0.07)] transition-colors hover:bg-neutral-50"
          >
            <ChevronLeft />
          </Button>
          <Button
            isIconOnly
            variant="tertiary"
            aria-label="Next slide"
            onPress={scrollNext}
            className="flex h-13 w-13 items-center justify-center rounded-2xl border border-border bg-surface text-foreground shadow-[0_2.88px_5.32px_0_rgba(0,0,0,0.02),0_12.58px_17.87px_0_rgba(0,0,0,0.04),0_24px_40px_0_rgba(0,0,0,0.07)] transition-colors hover:bg-neutral-50"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </Section>
  );
}
