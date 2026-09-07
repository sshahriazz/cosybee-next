import { type ReactNode } from "react";
import { AppLink as Link } from "@/app/components/ui/AppLink";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Heading, Text } from "@/app/components/ui/Typography";
import DecorHex from "@/app/components/ui/DecorHex";
import {
  CTA_BASE_CLASSES,
  CTA_SIZE_CLASSES,
  HEX_PATTERN_BG,
} from "@/app/components/ui/Cta";
import { HEX_PATH } from "@/app/lib/hex";

/** One "were you looking for…" card on a 404 page. */
export type NotFoundDestination = {
  href: string;
  title: string;
  description: string;
};

/**
 * The three places a lost visitor most likely wanted: the two product
 * stories and the blog. Kept here so every 404 in the app offers the same
 * routes — override via the `destinations` prop for a subtree that has
 * better suggestions of its own (see BlogNotFound).
 */
export const DEFAULT_DESTINATIONS: ReadonlyArray<NotFoundDestination> = [
  {
    href: "/solar",
    title: "Solar energy",
    description:
      "See what your panels made today — and what the sun has planned for tomorrow.",
  },
  {
    href: "/smart",
    title: "Smart heating",
    description:
      "Warm rooms when you walk into them. No quiet, expensive heating when you don't.",
  },
  {
    href: "/hive",
    title: "The Hive",
    description:
      "The hive of activity — guides, updates and stories from homes much like yours.",
  },
];

/** Small link row shown under the primary CTA. */
export type NotFoundShortcut = { href: string; label: string };

const DEFAULT_SHORTCUTS: ReadonlyArray<NotFoundShortcut> = [
  { href: "/energy", label: "Energy" },
  { href: "/learn", label: "Learn" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Just ask us" },
];

/** Tiny brand hex used as a bullet in the status pill. */
function HexDot() {
  return (
    <svg viewBox="0 0 100 86.6" className="h-2.5 w-3 shrink-0" aria-hidden>
      <path d={HEX_PATH} fill="currentColor" />
    </svg>
  );
}

// function ArrowRight() {
//   return (
//     <svg
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
//       aria-hidden="true"
//     >
//       <line x1="4" y1="12" x2="19" y2="12" />
//       <polyline points="13 6 19 12 13 18" />
//     </svg>
//   );
// }

/**
 * Destination card — title, description, and a "Have a look" affordance.
 * The title carries a stretched link so the whole card is one click target
 * while the markup stays a single, honest anchor.
 */
// function DestinationCard({ href, title, description }: NotFoundDestination) {
//   return (
//     <article className="group relative flex h-full flex-col rounded-3xl border border-border bg-surface p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none sm:p-7">
//       <h3 className="text-[20px] leading-[130%] font-bold text-foreground">
//         {/* Stretched link: the pseudo-element covers the card, so the whole
//             tile is clickable without wrapping everything in an anchor. */}
//         <Link
//           href={href}
//           className="after:absolute after:inset-0 after:content-['']"
//         >
//           {title}
//         </Link>
//       </h3>
//       <p className="mt-3 text-base font-medium text-muted">{description}</p>
//       <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
//         Have a look
//         <ArrowRight />
//       </span>
//     </article>
//   );
// }

type Props = {
  /** Warm sentence-case label above the headline, e.g. "Page not found". */
  status?: string;
  /** The friendly headline. */
  title: ReactNode;
  /** Reassuring paragraph under the headline. */
  lead: ReactNode;
  /**
   * Tailwind max-width utility for the lead column, e.g. "max-w-xl". Pass a
   * wider one when the copy runs long enough to look cramped at the default.
   * Must be a literal class in the caller's source so Tailwind emits it.
   */
  leadWidth?: string;
  /** Filled brand CTA. Defaults to the home page. */
  primary?: NotFoundShortcut;
  /** Cards offered under the copy. Defaults to solar / heating / the Hive. */
  destinations?: ReadonlyArray<NotFoundDestination>;
  /** Quiet text links under the cards. Pass `[]` to hide the row. */
  shortcuts?: ReadonlyArray<NotFoundShortcut>;
  /** Lead-in before the shortcut links. */
  shortcutsLabel?: string;
};

/**
 * Shared 404 body — a warm "nothing's broken, we've just moved things about"
 * page rather than an error screen. Every not-found route renders this so a
 * missing URL still feels like the rest of the site: honeycomb wash, brand
 * type scale, and the same card language as the marketing sections.
 *
 * The status code is carried by the background watermark rather than the
 * copy: a visitor who has lost their way needs reassurance first, and the
 * number is orientation, not the message.
 *
 * Server component. Each route supplies its own copy; the destination cards
 * fall back to {@link DEFAULT_DESTINATIONS}.
 */
export default function NotFoundView({
  status = "Page not found",
  title,
  lead,
  leadWidth = "max-w-lg",
  primary = { href: "/", label: "Back to home" },
  // destinations = DEFAULT_DESTINATIONS,
  shortcuts = DEFAULT_SHORTCUTS,
  shortcutsLabel = "Not quite what you were after?",
}: Props) {
  return (
    <main className="flex flex-1 flex-col justify-center">
      <Section
        spacing="lg"
        surface="none"
        className="flex min-h-[90vh] flex-col justify-center bg-linear-to-b from-[#FDF8EA] via-background to-background text-foreground dark:from-surface"
      >
        {/* Honeycomb wash — the same tile the CTA banner wears, faded out
            downwards so the cards sit on clean background. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-140 opacity-70 mask-[linear-gradient(to_bottom,black,transparent)] dark:opacity-25"
          style={HEX_PATTERN_BG}
        />

        <Container>
          {/* decorative cream hexes bleeding in from both edges */}
          <DecorHex side="right" className="-top-16 w-64 dark:opacity-15" />
          <DecorHex
            side="left"
            size="sm"
            className="bottom-2 hidden sm:block dark:opacity-15"
          />

          {/* 404 watermark — centred on the copy block (which is z-10) and
              carrying the status code visually, so the words never have to. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 text-center text-[12rem] leading-none font-extrabold tracking-tighter text-[#f5e0a943] select-none sm:text-[14rem] lg:text-[32rem] dark:text-white/3"
          >
            404
          </span>

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-[#7A6A1F] shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] ring-1 ring-[#EFE3BE] dark:text-accent dark:ring-border">
              <HexDot />
              {status}
            </p>

            <Heading as="h1" variant="display" className="mt-6 text-foreground">
              {title}
            </Heading>

            <Text
              variant="lead"
              tone="muted"
              className={`mx-auto mt-3 ${leadWidth} whitespace-pre-line`}
            >
              {lead}
            </Text>

            <div className="mt-8 flex justify-center">
              <Link
                href={primary.href}
                className={`${CTA_BASE_CLASSES} ${CTA_SIZE_CLASSES.md} w-full sm:w-auto`}
              >
                {primary.label}
              </Link>
            </div>
          </div>

          {/* {destinations.length > 0 && (
            <div className="relative z-10 mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
              {destinations.map((d) => (
                <DestinationCard key={d.href} {...d} />
              ))}
            </div>
          )} */}

          {shortcuts.length > 0 && (
            <p className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-sm font-medium text-muted">
              <span className="mr-1">{shortcutsLabel}</span>
              {shortcuts.map((s, i) => (
                <span key={s.href} className="inline-flex items-center gap-2">
                  {i > 0 && (
                    <span aria-hidden className="text-border">
                      /
                    </span>
                  )}
                  <Link
                    href={s.href}
                    className="font-semibold text-foreground underline-offset-4 transition-colors hover:underline"
                  >
                    {s.label}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </Container>
      </Section>
    </main>
  );
}
