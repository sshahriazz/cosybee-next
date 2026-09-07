import Image, { type StaticImageData } from "next/image";
import { type ReactNode } from "react";
import { Heading, Text } from "@/app/components/ui/Typography";
import { HEX_PATH } from "@/app/lib/hex";
import hexaCheck from "@/public/hexa-check.svg";
import hexaSun from "@/public/hexa-sun.svg";
import hexaDollar from "@/public/hexa-dollar.svg";
import hexaChart from "@/public/hexa-chart.svg";
import hexaDevice from "@/public/simplified.svg";
import hexaConnector from "@/public/connection.svg";
import hexaPie from "@/public/hexa-home.svg";
import energy from "@/public/energy.svg";
import insights from "@/public/insights.svg";
import weather from "@/public/weather.svg";
import solarSun from "@/public/solar-sun.svg";
import money from "@/public/track-savings.svg";
import poundSign from "@/public/pound-sign.svg";
import homeConnect from "@/public/home-connect.svg";
import house from "@/public/home.svg";
import phone from "@/public/device.svg";
import connect from "@/public/connect-energy.svg";
import greenFuture from "@/public/Built-for-a-Greener-Future.svg";
import carbonEfficiency from "@/public/Carbon-Footprint-Impact.svg";
import envImpact from "@/public/Environmental-Impact.svg";

const GLYPH_SVGS: Record<GlyphName, StaticImageData> = {
  check: hexaCheck,
  sun: hexaSun,
  dollar: hexaDollar,
  chart: hexaChart,
  device: hexaDevice,
  connector: hexaConnector,
  pie: hexaPie,
  energy,
  insights,
  weather,
  solar: solarSun,
  savings: money,
  pound: poundSign,
  home: homeConnect,
  house,
  phone,
  connect,
  carbon: carbonEfficiency,
  green: greenFuture,
  environment: envImpact,
};

/** Names of the glyph drawn inside a yellow hex badge. */
export type GlyphName =
  | "environment"
  | "green"
  | "check"
  | "sun"
  | "dollar"
  | "chart"
  | "device"
  | "connector"
  | "pie"
  | "energy"
  | "insights"
  | "weather"
  | "solar"
  | "savings"
  | "pound"
  | "home"
  | "house"
  | "phone"
  | "carbon"
  | "connect";

/** Subset of GlyphName that has an inline-SVG implementation for HexBadge.
 *  The newer glyphs (device, connector, pie) are rendered as standalone
 *  hex assets via FeatureCard's GLYPH_SVGS map, so they don't appear here. */
export type InlineGlyphName = "check" | "sun" | "dollar" | "chart";

const GLYPHS: Record<InlineGlyphName, ReactNode> = {
  check: (
    <path
      d="M30 44 L43 57 L70 30"
      stroke="white"
      strokeWidth="8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  sun: (
    <g
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
      transform="translate(50 43.3)"
    >
      <circle r="9" />
      <line x1="0" y1="-18" x2="0" y2="-14" />
      <line x1="0" y1="14" x2="0" y2="18" />
      <line x1="-18" y1="0" x2="-14" y2="0" />
      <line x1="14" y1="0" x2="18" y2="0" />
      <line x1="-13" y1="-13" x2="-10" y2="-10" />
      <line x1="10" y1="-11" x2="13" y2="-14" />
      <line x1="-13" y1="13" x2="-10" y2="10" />
      <line x1="10" y1="11" x2="13" y2="14" />
    </g>
  ),
  dollar: (
    <text
      x="50"
      y="60"
      textAnchor="middle"
      fill="white"
      fontSize="42"
      fontWeight="700"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      $
    </text>
  ),
  chart: (
    <g
      stroke="white"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <rect x="30" y="26" width="40" height="36" rx="3" />
      <line x1="40" y1="55" x2="40" y2="48" />
      <line x1="50" y1="55" x2="50" y2="44" />
      <line x1="60" y1="55" x2="60" y2="40" />
      <polyline points="38 40 50 34 62 36" />
    </g>
  ),
};

/**
 * Yellow hex badge with a white glyph inside. Sized via Tailwind classes on
 * the SVG element — width/height utilities both work because the SVG keeps
 * its own viewBox aspect ratio.
 */
export function HexBadge({
  glyph,
  color = "#EDC535",
  className = "",
}: {
  /** Only the inline-renderable glyphs (check/sun/dollar/chart) — the
   *  newer hex assets are used via FeatureCard, not HexBadge. */
  glyph: InlineGlyphName;
  /** Hex fill color. Defaults to the cosybee yellow. */
  color?: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 86.6" className={`shrink-0 ${className}`} aria-hidden>
      <path d={HEX_PATH} fill={color} />
      {GLYPHS[glyph]}
    </svg>
  );
}

/**
 * Centered section header — big title + optional muted description.
 * Drop above any block of cards or features.
 */
export function SectionHeader({
  title,
  description,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto text-left min-[550px]:text-center z-9 ${className}`}
    >
      <Heading variant="title" className="text-foreground">
        {title}
      </Heading>
      {description && <SectionLead>{description}</SectionLead>}
    </div>
  );
}

/**
 * Card with a media slot (image, phone mockup, anything) on top, then
 * title + description + optional bullet list. Pass any ReactNode as `media`.
 */
export function MediaCard({
  media,
  title,
  description,
  bullets,
  mediaBg = "#E5F2F6",
}: {
  media?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  bullets?: string[];
  /** Background tint for the media area. */
  mediaBg?: string;
}) {
  return (
    <article className="overflow-hidden max-w-115 rounded-3xl border border-border bg-surface shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)]">
      {media && (
        <div
          className="flex items-end justify-center mx-6 mt-6 rounded-xl pt-6 overflow-hidden max-h-90"
          style={{ backgroundColor: mediaBg }}
        >
          {media}
        </div>
      )}
      <div className="p-6 sm:p-7">
        <h3 className="text-2xl font-bold text-foreground sm:text-[20px] leading-[100%]">
          {title}
        </h3>
        <p className="mt-3 text-sm text-muted sm:text-base font-medium">
          {description}
        </p>
        {bullets && bullets.length > 0 && (
          <ul className="mt-5 space-y-2">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-3">
                <Image
                  src={hexaCheck}
                  alt=""
                  aria-hidden
                  className="h-4.5 w-5.5 "
                />
                <span className="text-sm text-muted sm:text-sm leading-[100%] font-medium">
                  {b}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

/** Large bold section heading (e.g. "Why Choose EnergieBee Solar?").
 *  Default alignment: text-left below sm, centered sm-to-1199, text-left at
 *  1200px+. Pass `align="center"` when the title should stay centered at
 *  desktop (e.g. for sections with a centered text column). */
export function SectionTitle({
  children,
  className = "",
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  /** Alignment at ≥1200px. Below 1200px is always sm:text-center. */
  align?: "left" | "center";
}) {
  const desktopAlign =
    align === "center"
      ? "min-[1200px]:text-center!"
      : "min-[1200px]:text-left!";
  return (
    <Heading
      variant="title"
      className={`min-[550px]:text-left ${desktopAlign} text-foreground ${className}`}
    >
      {children}
    </Heading>
  );
}

/** Muted intro paragraph that sits below a SectionTitle. */
export function SectionLead({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Text
      variant="lead"
      tone="muted"
      className={`mt-4 max-w-lg text-[20px] leading-8 text-muted  font-medium ${className}`}
    >
      {children}
    </Text>
  );
}

/**
 * Plain feature row (no card background) — yellow hex check badge + title +
 * description. Uses the static /public/hexa-check.svg.
 */
export function FeatureItem({
  glyph,
  title,
  description,
  titleClassName,
  descClassName,
  descWidth = "md:w-[75%]",
}: {
  glyph?: GlyphName;
  title: string;
  description: string;
  titleClassName?: string;
  descClassName?: string;
  descWidth?: string;
}) {
  return (
    <div className="flex flex-col md:flex-row items-start gap-4 rounded-2xl bg-inherit py-2 w-full">
      <Image
        src={glyph ? GLYPH_SVGS[glyph] : hexaCheck}
        alt={`glyph icon - ${glyph} icon`}
        aria-hidden
        className="h-11 w-12 lg:h-12 lg:w-13"
      />
      <div className="w-full">
        <h3
          className={`text-lg leading-[100%] font-semibold text-foreground sm:text-[20px]  ${titleClassName}`}
        >
          {title}
        </h3>
        <p
          className={`mt-2 text-base font-medium ${descWidth} text-muted ${descClassName}`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

/**
 * White card with shadow — hex badge + title + description. The card itself
 * is full-width; wrap or grid as needed at the call site.
 */
export function FeatureCard({
  glyph,
  title,
  description,
  titleClassName,
  descClassName,
  descWidth = "md:w-[75%]",
}: {
  glyph: GlyphName;
  title: string;
  description: string;
  titleClassName?: string;
  descClassName?: string;
  descWidth?: string;
}) {
  return (
    <div className="flex flex-col md:flex-row items-start gap-4 rounded-2xl bg-inherit py-2 w-full">
      <Image
        src={glyph ? GLYPH_SVGS[glyph] : hexaCheck}
        alt={`glyph icon - ${glyph} icon`}
        aria-hidden
        className="h-11 w-12 lg:h-12 lg:w-13"
      />
      <div className="w-full">
        <h3
          className={`text-lg leading-[100%] font-semibold text-foreground sm:text-[20px]  ${titleClassName}`}
        >
          {title}
        </h3>
        <p
          className={`mt-2 text-base font-medium ${descWidth} text-muted ${descClassName}`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
