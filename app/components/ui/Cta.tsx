import { Card } from "@heroui/react";
import Image from "next/image";
import { type ReactNode } from "react";
import { HexBadge, type InlineGlyphName } from "./SectionContent";
import ctaBgShortImg from "@/public/cta-bg-short.png";

type CtaSize = "sm" | "md" | "lg";
type CtaVariant = "accent" | "dark";

/**
 * The CTA's look, split from the component so a Next `<Link>` can wear it too.
 *
 * `CtaButton` renders a plain `<a>`, which is right for in-page CTAs but costs
 * a full document load — unacceptable in the navbar, where every other item is
 * a client-side `<Link>`. Exporting the classes lets the navbar keep Next
 * routing while staying visually identical, instead of forking the styling.
 *
 * Plain constants rather than a `ctaClasses()` helper on purpose: this module
 * is imported by client components, and the React Compiler instruments
 * module-level helpers called from them with their own `useMemoCache`, which
 * blows up as an invalid hook call. A string can't.
 */
export const CTA_BASE_CLASSES =
  "inline-flex shrink-0 items-center justify-center rounded-lg bg-accent font-semibold text-[#0C0C0C] transition hover:brightness-110";

/**
 * Dark twin of `CTA_BASE_CLASSES` — same geometry, inverted colours — for CTAs
 * that sit on a light/washed surface where the accent button reads as another
 * patch of the background rather than as the thing to press.
 *
 * `bg-foreground`/`text-background` rather than literal black/white so the
 * button inverts with the theme instead of going invisible on a dark surface.
 * The hover is a fade, not `brightness-110`: near-black barely moves under a
 * brightness filter (and near-white in dark mode moves not at all).
 */
export const CTA_DARK_CLASSES =
  "inline-flex shrink-0 items-center justify-center rounded-lg bg-foreground font-semibold text-background transition hover:bg-foreground/85";

export const CTA_SIZE_CLASSES: Record<CtaSize, string> = {
  // Navbar scale — has to clear the 64px mobile / 80px desktop header.
  sm: "h-10 px-4 text-base leading-[100%] lg:h-11 lg:px-5",
  md: "h-12 lg:h-[58.66px] px-6 text-base lg:text-lg leading-[100%]",
  lg: "px-10 py-4 text-lg sm:px-12 sm:text-xl",
};

/**
 * The call-to-action button used across the marketing pages. `size="lg"` is
 * the hero variant; `size="md"` is the banner variant; `size="sm"` is the
 * navbar variant. `variant="dark"` swaps the accent fill for the inverted
 * near-black one (see `CTA_DARK_CLASSES`).
 */
export function CtaButton({
  href,
  children,
  size = "md",
  variant = "accent",
  className = "",
  external = false,
}: {
  href: string;
  children: ReactNode;
  size?: CtaSize;
  variant?: CtaVariant;
  className?: string;
  /** Open in a new tab with safe rel — for off-site links. */
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${variant === "dark" ? CTA_DARK_CLASSES : CTA_BASE_CLASSES} ${CTA_SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </a>
  );
}

// Two layered SVG patterns — same hex outline, second offset by half a tile —
// give a true honeycomb instead of a rectangular grid.
const HEX_TILE = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 52'><polygon points='15,0 45,0 60,26 45,52 15,52 0,26' fill='none' stroke='rgba(0,0,0,0.07)' stroke-width='1.2'/></svg>`,
);
/** Repeating honeycomb wash. Exported so other surfaces (the 404 page) can
 *  wear the same texture instead of inventing a second honeycomb. */
export const HEX_PATTERN_BG = {
  backgroundImage: `url("data:image/svg+xml;utf8,${HEX_TILE}"), url("data:image/svg+xml;utf8,${HEX_TILE}")`,
  backgroundPosition: "0 0, 30px 26px",
  backgroundSize: "60px 52px, 60px 52px",
  backgroundRepeat: "repeat, repeat",
} as const;

/**
 * The `public/arrow-right-icon.svg` glyph, inlined.
 *
 * Inlined rather than `<Image src="/arrow-right-icon.svg">` because the file
 * is stroked with `currentColor`: as an `<img>` it would render a fixed black
 * arrow, which disappears on the dark CTA variant. As real SVG it inherits the
 * button's text colour, so it works on both fills. The nudge on hover is the
 * house treatment, and it stands still for reduced-motion users.
 */
export function CtaArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none ${className}`}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/**
 * The `public/shavron.svg` chevron, inlined for the same reason as
 * `CtaArrow` — the file strokes with `currentColor`, which an `<img>` would
 * flatten to black and lose on the dark CTA fill.
 */
export function CtaChevron({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none ${className}`}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/**
 * Wide light-card banner with a subtle honeycomb background — text on the
 * left, CtaButton on the right. Renders as a `<section>` already wrapped in
 * page-edge padding, so just drop it between sections.
 */
export function CtaBanner({
  title,
  description,
  buttonText,
  href,
}: {
  title: string;
  description: string;
  buttonText: string;
  href: string;
}) {
  return (
    <section className="px-6 py-12 sm:px-10 lg:px-30 lg:py-16">
      <div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-surface px-8 py-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)] sm:px-12 lg:px-30 lg:py-14"
        style={HEX_PATTERN_BG}
      >
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-extrabold leading-tight text-foreground sm:text-3xl lg:text-4xl">
              {title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              {description}
            </p>
          </div>
          <CtaButton href={href}>{buttonText}</CtaButton>
        </div>
      </div>
    </section>
  );
}

/**
 * Horizontal CTA card: hex icon (left) + title & description (middle) +
 * CtaButton (right). Stacks vertically below `lg`.
 */
export function CtaCard({
  glyph,
  glyphColor = "#A3D055",
  title,
  description,
  buttonText,
  href,
  className = "",
  titleClassName = "",
  descClassName = "",
  buttonClassName = "",
}: {
  glyph?: InlineGlyphName;
  glyphColor?: string;
  title: ReactNode;
  description: ReactNode;
  buttonText: string;
  href: string;
  className?: string;
  titleClassName?: string;
  descClassName?: string;
  buttonClassName?: string;
}) {
  // HeroUI Card: `variant="secondary"` supplies the themed surface + border;
  // Card.Title / Card.Description give semantic, theme-aware text (no manual
  // colour classes). We keep the brand radius/shadow/padding and the
  // horizontal-at-1200px layout via className.
  //
  // The honeycomb wash is `cta-bg-short.png` served through next/image (the
  // same treatment the home ReadyToReduce band gives cta-bg.png) rather than a
  // CSS background, so it ships resized and as AVIF/WebP. `isolate` + `-z-10`
  // layer it over the themed surface but under the content — no z-index on
  // every child — `overflow-hidden` clips it to the brand radius, and
  // `dark:hidden` drops it so the dark surface takes over.
  return (
    <Card
      variant="secondary"
      className={`relative isolate flex-col items-start gap-7 overflow-hidden rounded-3xl p-6 shadow-[9px_9px_13px_0_rgba(0,0,0,0.04),-11px_-8px_14px_0_rgba(0,0,0,0.03)] sm:p-7 min-[1200px]:flex-row min-[1200px]:items-center min-[1200px]:gap-5 min-[1200px]:p-12! ${className}`}
    >
      <Image
        src={ctaBgShortImg}
        alt=""
        aria-hidden="true"
        fill
        sizes="(min-width: 1200px) 1200px, 100vw"
        // 90 is the top of next.config's `qualities` allow-list; the comb's
        // gradient bands below it.
        quality={90}
        className="pointer-events-none -z-10 object-cover object-right select-none dark:hidden"
      />
      {glyph && (
        <HexBadge
          glyph={glyph}
          color={glyphColor}
          className="h-14 w-16 sm:h-18 sm:w-22"
        />
      )}
      <Card.Header className="flex-1 gap-0 p-0">
        <Card.Title
          className={`text-2xl font-extrabold leading-[110%] tracking-tight text-balance sm:text-3xl lg:text-[40px] ${titleClassName}`}
        >
          {title}
        </Card.Title>
        <Card.Description
          className={`mt-4 max-w-160 text-sm font-medium whitespace-pre-line text-muted sm:text-xl leading-normal ${descClassName}`}
        >
          {description}
        </Card.Description>
      </Card.Header>
      <CtaButton
        href={href}
        size="sm"
        variant="dark"
        className={`w-full sm:w-auto ${buttonClassName}`}
      >
        {buttonText}
      </CtaButton>
    </Card>
  );
}
