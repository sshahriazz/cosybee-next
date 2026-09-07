"use client";

import { useEffect, useRef, useState } from "react";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { SectionHeader } from "@/app/components/ui/SectionContent";
import { HEX_PATH_BADGE } from "@/app/lib/hex";
import type { StaticImageData } from "next/image";
import downloadImg from "@/public/download-app/download_app-full.png";
import accountImg from "@/public/download-app/create_account-full.png";
import connectImg from "@/public/download-app/connect_home-full.png";
import homeImg from "@/public/download-app/app_home-full.png";

// Badge palette, lifted straight from the reference tile in
// `public/home.svg`: pale face, gold outline, dark-olive glyph.
const HEX_FACE = "#FFF89D";
const HEX_STROKE = "#D4C60F";
const HEX_LABEL = "#544E08";

// A real sequence the user performs in order — numbering carries information.
const STEPS: ReadonlyArray<{
  title: string;
  description: string;
  image: StaticImageData;
}> = [
  {
    title: "Download the app",
    description: "From the App Store or Google Play.",
    image: downloadImg,
  },
  {
    title: "Create your free account",
    description: "Free sign-up, under a minute.",
    image: accountImg,
  },
  {
    title: "Connect your home",
    description: "With your EPC data.",
    image: connectImg,
  },
  {
    title: "Manage everything in one place",
    description: "All your energy data, one dashboard.",
    image: homeImg,
  },
];

/**
 * "Up and running in four steps", v2 — a PINNED scrollytelling section
 * (desktop): a tall runway wrapper provides scroll distance while the section
 * content sticks to the viewport, so the page appears to pause here until all
 * four steps have played through. Scroll progress through the runway — not
 * clicks — drives which step is active: the reached step's hex fills from
 * pale to solid yellow and the full app screenshot in the cream panel on the
 * left crossfades to that step's shot (the complete `-full` phone mockups).
 *
 * Below `lg` there's no pinning: the timeline renders as a plain readable
 * list (every hex in its pale outlined resting state), the panel shows the
 * first screenshot, and the scroll listener never attaches.
 */
export default function GettingStartedV2() {
  // Continuous scroll progress through the runway (0–1). It drives the
  // connector fill directly; its floored value is the active step (which
  // screenshot shows, which hex is "current").
  const [progress, setProgress] = useState(0);
  const runwayRef = useRef<HTMLDivElement | null>(null);
  const active = Math.min(
    STEPS.length - 1,
    Math.floor(progress * STEPS.length),
  );

  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const runway = runwayRef.current;
    if (!runway) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = runway.getBoundingClientRect();
      // Measure the pinned child, not the viewport: its min-height floor can
      // make it taller than the screen, and the section unpins when the
      // runway bottom meets the CHILD's bottom — using innerHeight there
      // would leave progress stuck short of 1 (last step never lights).
      const pinned = runway.firstElementChild as HTMLElement | null;
      const distance =
        rect.height - (pinned?.offsetHeight ?? window.innerHeight);
      if (distance <= 0) return;
      // 0 when the section pins, 1 when the runway ends and it unpins.
      const next = Math.min(1, Math.max(0, -rect.top / distance));
      setProgress(next);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    // overflow="visible" is required: Section defaults to overflow-hidden,
    // and a hidden-overflow ancestor silently disables position:sticky — the
    // pinning would not work at all.
    <Section spacing="none" overflow="visible">
      {/* The runway: its extra height beyond one screen is the scroll
          distance the pinned content plays through — ~55vh per step. */}
      <div ref={runwayRef} className="lg:h-[265vh]">
        {/* min-h floor: on short viewports (small laptops, landscape tablets)
            h-screen alone is too little for the header + 480px panel +
            timeline; below 45rem the box grows past the viewport instead of
            crushing its content. Centering comes from my-auto on the child,
            NOT justify-center: auto margins collapse to 0 when the content
            overflows the box, keeping the heading reachable at the top —
            justify-center would overflow both ways and clip it. */}
        <div className="py-16 lg:sticky lg:top-0 lg:flex lg:h-screen lg:min-h-180 lg:flex-col lg:py-8">
          <Container className="lg:my-auto">
            <SectionHeader
              title="Up and running in four steps"
              description="From install to insight in one evening — the app guides you through each step."
              className="flex flex-col items-center"
            />

            <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 items-center gap-10 lg:mt-10 lg:grid-cols-2 lg:gap-16">
              {/* left: shared cream panel — DESKTOP ONLY. Screenshots
                  crossfade as scroll changes the active step. Below lg there's
                  no scroll tracking, so this shared panel would freeze on step
                  1; the per-step images in the timeline take over instead. */}
              <div
                aria-hidden
                className="relative hidden h-120 overflow-hidden rounded-3xl bg-[#C7B7341A] lg:block"
              >
                {STEPS.map(({ image }, i) => (
                  <Image
                    key={i}
                    src={image}
                    alt=""
                    aria-hidden
                    fill
                    quality={85}
                    placeholder="blur"
                    sizes="320px"
                    className={`object-contain p-6 transition-opacity duration-500 motion-reduce:transition-none ${
                      i === active
                        ? "opacity-100"
                        : "pointer-events-none opacity-0"
                    }`}
                  />
                ))}
              </div>

              {/* right: numbered timeline. On desktop scroll progress
                  highlights a step; on mobile every step shows its own
                  screenshot inline so the image always matches the copy. */}
              <ol className="m-0 list-none p-0">
                {STEPS.map((step, i) => (
                  <li
                    key={step.title}
                    aria-current={i === active ? "step" : undefined}
                    className="relative pb-10 last:pb-0 lg:pb-9"
                  >
                    {/* connector doubling as a scroll-progress bar — desktop
                        only (on mobile the inline image sits between steps).
                        A grey dotted track with a yellow fill whose height
                        tracks how far scroll has moved through this segment. */}
                    {i < STEPS.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-8 top-15 hidden h-[calc(100%-4.25rem)] w-0 -translate-x-1/2 lg:block"
                      >
                        <span className="absolute inset-y-0 left-0 border-l-2 border-dotted border-border" />
                        {/* No CSS transition: the fill follows scroll frame by
                            frame, so any easing would only add lag. */}
                        <span
                          className="absolute left-0 top-0 border-l-2 border-dotted border-[#EFDF18]"
                          style={{
                            height: `${
                              Math.min(
                                1,
                                Math.max(0, progress * STEPS.length - i),
                              ) * 100
                            }%`,
                          }}
                        />
                      </span>
                    )}

                    <div className="flex items-start gap-6">
                      {/* viewBox is padded by half the stroke width on every
                          side: the path touches 0/100 and 0/86.6, so a centred
                          outline would be clipped in half by a plain
                          0 0 100 86.6 box. */}
                      <svg
                        viewBox="-1.63 -1.63 103.26 89.86"
                        className="h-12 w-14 shrink-0 sm:h-13 sm:w-15"
                        aria-hidden
                      >
                        {/* Resting look: pale yellow face with a gold outline.
                            Below lg it stays that way for every hex (no scroll
                            tracking there); at lg+ a hex fills solid yellow
                            once scroll reaches it and stays lit — a cumulative
                            progress stepper matching the connector fill. */}
                        <path
                          d={HEX_PATH_BADGE}
                          fill={HEX_FACE}
                          stroke={HEX_STROKE}
                          strokeWidth={3.25}
                          className={`transition-[fill] duration-300 ${
                            progress * STEPS.length >= i
                              ? "lg:fill-[#EFDF18]"
                              : ""
                          }`}
                        />
                        <text
                          x="50"
                          y="46"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="30"
                          fontWeight="800"
                          fill={HEX_LABEL}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </text>
                      </svg>
                      <div className="pt-0.5">
                        <h3 className="text-lg font-extrabold leading-tight text-foreground sm:text-xl">
                          {step.title}
                        </h3>
                        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    {/* per-step screenshot — MOBILE ONLY. `display:none` at lg
                        means Next never downloads it on desktop, and the hidden
                        desktop panel never downloads on mobile. */}
                    <div
                      aria-hidden
                      className="relative mt-6 h-96 overflow-hidden rounded-3xl bg-[#F7F2E1] lg:hidden"
                    >
                      <Image
                        src={step.image}
                        alt=""
                        aria-hidden
                        fill
                        quality={85}
                        placeholder="blur"
                        sizes="(min-width: 640px) 400px, 90vw"
                        className="object-contain p-6"
                      />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </div>
      </div>
    </Section>
  );
}
