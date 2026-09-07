"use client";

import { useSyncExternalStore } from "react";
import { AppLink as Link } from "@/app/components/ui/AppLink";
import {
  FALLBACK_PHRASES,
  phraseIndexForDate,
  type Phrase,
} from "@/app/lib/phrase-of-the-week";

/**
 * The week never changes underneath a loaded page, so there is nothing to
 * subscribe to — this exists only to satisfy `useSyncExternalStore`'s shape.
 * Defined at module scope so React isn't handed a new function every render
 * (which would make it re-subscribe each time).
 *
 * `"use no memo"` — React Compiler runs in `compilationMode: "all"` and would
 * otherwise inject a `useMemoCache` hook into this top-level function, which
 * throws when React calls it outside a render.
 */
const subscribe = () => {
  "use no memo";
  return () => {};
};

/**
 * Phrase of the Week — a quiet editorial line in the footer: one quote, its
 * author, and a link to the article it is paired with. The rotation is curated
 * by an admin (/admin/phrases) and handed down as `phrases`; which entry shows
 * is derived from the ISO week number (see lib/phrase-of-the-week.ts).
 *
 * WHY THIS IS A CLIENT COMPONENT, when a footer has no interactivity:
 * the footer lives in the root layout, which renders on fully static pages
 * (/privacy, /terms, /smart, …). A server-only `new Date()` is evaluated when
 * the page is built, so on those pages the phrase would freeze at deploy time
 * and never turn over — a "weekly" feature that changes only when someone
 * ships. Deriving it in the browser keeps it correct on every page without
 * converting the whole site to ISR for the sake of a footer quote.
 *
 * The server still renders a real phrase (`initialIndex`), so there is markup
 * in the HTML for crawlers and for users without JS, and no layout shift. The
 * effect then re-derives from the visitor's clock; when the two agree — the
 * common case — React bails out of the update and nothing flickers.
 */
export default function PhraseOfTheWeek({
  phrases,
  initialIndex,
}: {
  /** The curated rotation, active entries only, in admin-chosen order. */
  phrases: readonly Phrase[];
  /** Index computed during the server render, from `phraseIndexForDate`. */
  initialIndex: number;
}) {
  // An empty rotation (every phrase deactivated, or the API unreachable) still
  // has to render a real quote — the footer is on every page of the site.
  const list = phrases.length > 0 ? phrases : FALLBACK_PHRASES;

  // Hydrates with the server's value (so the first client render matches the
  // HTML exactly), then reads the visitor's own clock. Returning a number
  // keeps the snapshot stable across calls, which is what stops
  // `useSyncExternalStore` from looping.
  const index = useSyncExternalStore(
    subscribe,
    () => phraseIndexForDate(new Date(), list.length),
    () => initialIndex,
  );

  const phrase = list[index] ?? list[0];

  return (
    <figure className="relative max-w-3xl">
      {/* <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
        Phrase of the week
      </h3> */}

      {/* Curly quotes in the markup, not CSS `quotes` — they need to survive
          into the text a visitor copies, and into the RSS-style previews some
          browsers generate from selections. */}
      <blockquote className="mt-3 text-balance font-medium! text-center leading-[150%] text-[13px]! italic text-white/90 sm:text-base">
        &ldquo;{phrase.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-3 flex flex-wrap justify-center items-center gap-x-5 gap-y-1.5 text-sm">
        {/* Not <cite>: that element is for the title of a work, not a person. */}
        <span className="font-medium text-white/60">
          &mdash; {phrase.author}
        </span>

        {/* `after:absolute after:inset-0` stretches this link over the whole
            figure, so the quote itself is clickable while the page keeps a
            single tab stop and a short, meaningful accessible name. */}
        <Link
          href={phrase.article}
          aria-label={`Read the article behind this week's phrase, quoting ${phrase.author}`}
          className="group inline-flex items-center gap-1.5 font-semibold text-[#FF8A7A] transition-colors after:absolute after:inset-0 hover:text-white focus-visible:text-white"
        >
          Read article
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          >
            &rarr;
          </span>
        </Link>
      </figcaption>
    </figure>
  );
}
