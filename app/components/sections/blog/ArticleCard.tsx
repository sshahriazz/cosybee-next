"use client";

import { AppImage as Image } from "@/app/components/ui/AppImage";
import { AppLink as Link } from "@/app/components/ui/AppLink";
import {
  type ArticleSummary,
  type AuthorRef,
  type TagRef,
  formatDate,
  formatReadTime,
} from "@/app/lib/article-types";
import { crossOriginOf, unoptimizedFor } from "@/app/lib/image-optimization";
import Avatar from "@/app/components/ui/Avatar";
import Divider from "@/app/components/ui/Divider";
import Dot from "@/app/components/ui/Dot";

/** Pill overlaying the cover with the article's category. */
function CategoryBadge({ name }: { name: string }) {
  return (
    <span className="absolute left-4 top-4 rounded-full leading-[100%] bg-white/80 px-3 py-1.5 text-[13px] font-semibold text-primary">
      {name}
    </span>
  );
}

/** Read-time · date meta row. */
function ArticleMeta({ readTime, date }: { readTime: number; date: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] leading-[100%] text-muted">
      <span>{formatReadTime(readTime)}</span>
      <Dot />
      <span>{formatDate(date)}</span>
    </div>
  );
}

/**
 * Up to three `#tag` chips, each linking to its tag listing. `relative z-10`
 * lifts every chip above the title's stretched-link overlay (see ArticleCard)
 * — on the chips themselves, not the row, so the gaps between them still
 * belong to the card link.
 */
function TagList({ tags, basePath }: { tags: TagRef[]; basePath: string }) {
  if (tags.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {tags.slice(0, 3).map((t) => (
        <Link
          key={t.slug}
          href={`${basePath}/tag/${t.slug}`}
          className="relative z-10 rounded-md bg-background px-2 py-0.5 text-xs font-medium text-muted transition-colors hover:bg-[#E6EEF1] hover:text-[#1b4a5e]"
        >
          #{t.name}
        </Link>
      ))}
    </div>
  );
}

/**
 * Avatar + author name byline pinned to the bottom of the card, linking to
 * the author profile. Avatar and name share ONE link so the card carries no
 * duplicate route to the same page. Falls back to plain text when the author
 * has no slug.
 */
function AuthorByline({ author }: { author: AuthorRef }) {
  const name = author?.name ?? "energiebee";
  const avatar = (
    <Avatar name={name} avatarUrl={author?.avatarUrl} className="h-10 w-10" />
  );
  return (
    <div className="mt-auto pt-3">
      <Divider />
      <div className="mt-3 flex items-center">
        {author?.slug ? (
          <Link
            href={`/author/${author.slug}`}
            className="relative z-10 flex items-center gap-3 text-base leading-[100%] font-semibold text-foreground transition-colors hover:text-[#FF8A7A]"
          >
            {avatar}
            {name}
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            {avatar}
            <span className="text-sm font-semibold text-foreground">
              {name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Public-blog article card — cover image with category badge, then meta,
 * title, excerpt, tags, and an author byline. Linked to the article page.
 */
export function ArticleCard({
  a,
  basePath,
}: {
  a: ArticleSummary;
  basePath: string;
}) {
  // Warm up the host the BROWSER will fetch this cover from. Optimizable
  // covers are served by our own origin via /_next/image (the optimizer does
  // the cross-origin fetch server-side), so they need no hint at all — only a
  // cover that stays unoptimized is a real third-party connection. This used
  // to preconnect to NEXT_PUBLIC_API_URL unconditionally, which warmed a host
  // no cover is served from.
  const coverOrigin = crossOriginOf(a.coverImage);
  return (
    <>
      {/* React 19 hoists + dedups this, so N cards share one connection. */}
      {coverOrigin && <link rel="preconnect" href={coverOrigin} />}
      <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)] transition duration-300 hover:shadow-xl">
        <div className="relative h-50">
          <Image
            src={a.coverImage}
            alt={a.coverImageAlt}
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-103 motion-reduce:transform-none motion-reduce:transition-none"
            unoptimized={unoptimizedFor(a.coverImage)}
          />
          <CategoryBadge name={a.category?.name ?? "Uncategorised"} />
        </div>
        <div className="flex flex-1 flex-col p-6">
          <ArticleMeta readTime={a.readTime} date={a.authorDate} />
          <h3 className="mt-3 line-clamp-3 text-[20px] leading-[130%] font-bold text-foreground">
            {/* Stretched link: the pseudo-element covers the whole card, so
                the card is still one big click target for the article while
                the tag/author links inside it stay individually clickable. */}
            <Link
              title={a.title}
              href={`${basePath}/${a.slug}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {a.title}
            </Link>
          </h3>
          <p className="mt-3 line-clamp-3 text-base font-medium text-muted">
            {a.description}
          </p>
          <TagList tags={a.tags} basePath={basePath} />
          <AuthorByline author={a.author} />
        </div>
      </article>
    </>
  );
}
