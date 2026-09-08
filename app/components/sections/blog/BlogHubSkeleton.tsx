import Divider from "@/app/components/ui/Divider";
import { Section } from "@/app/components/ui/Section";

/**
 * The loading fallback for the `/hive` and `/learn` hubs.
 *
 * Both hubs read `searchParams` (in `generateMetadata` for the canonical /
 * robots decision, and in the body to seed the filter state), which makes them
 * fully dynamic — unlike every other nav target, they are not prerendered at
 * build time, so the router has no static shell to paint on click. Without a
 * loading boundary it simply held the previous page until the whole server
 * render landed, which reads as a dead click rather than a slow one.
 *
 * The shape mirrors the real hub — hero band, filter row, featured carousel,
 * card grid — at the SAME spacing and card heights, so the content swaps in
 * place instead of shoving the page around. Keep the two in step: the class
 * lists here are deliberate copies of BlogHero/PageHero, BlogFilterBar,
 * BlogFeatured and BlogLatestArticles.
 */

/** One placeholder bar. `bg-surface-tertiary` reads in both themes. */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-surface-tertiary ${className}`} />;
}

/** The same bar, on the hero's black band. */
function DarkBar({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-white/10 ${className}`} />;
}

/** Stand-in for one ArticleCard — matches its 200px cover and 24px padding. */
function CardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08)]">
      <div className="h-50 bg-surface-tertiary" />
      <div className="flex flex-1 flex-col p-6">
        <Bar className="h-3 w-40" />
        <Bar className="mt-4 h-5 w-full" />
        <Bar className="mt-2 h-5 w-4/5" />
        <Bar className="mt-4 h-4 w-full" />
        <Bar className="mt-2 h-4 w-2/3" />
        <div className="mt-4 flex gap-1.5">
          <Bar className="h-5 w-16" />
          <Bar className="h-5 w-20" />
        </div>
        <div className="mt-auto pt-3">
          <Divider />
          <div className="mt-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-surface-tertiary" />
            <Bar className="h-4 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Fixed keys for the placeholder grid — one screenful, not a whole page. */
const CARDS = ["a", "b", "c", "d", "e", "f"];

export default function BlogHubSkeleton() {
  return (
    <main className="flex-1">
      {/* The only thing announced. Everything below is decorative. */}
      <p role="status" className="sr-only">
        Loading articles…
      </p>

      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        {/* hero — mirrors BlogHero's minHeight and PageHero's inner column */}
        <Section
          surface="dark"
          spacing="none"
          className="isolate flex min-h-[30vh] flex-col justify-center md:min-h-[35vh]"
        >
          <div className="relative mx-auto w-full max-w-360 items-center px-6 pt-16 pb-24 lg:px-30 lg:pt-15 lg:pb-11">
            <DarkBar className="mb-5 h-4 w-48" />
            <DarkBar className="h-10 w-72 md:h-14 lg:h-16 lg:w-96" />
            <DarkBar className="mt-5 h-5 w-full max-w-129.5" />
            <DarkBar className="mt-2 h-5 w-full max-w-100" />
          </div>
        </Section>

        {/* filter bar — search field + category chip row */}
        <div className="mx-auto max-w-360 px-6 py-6 sm:px-10 lg:px-30">
          <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="h-11 w-full max-w-90.5 rounded-full bg-surface-tertiary" />
            <div className="flex flex-nowrap items-center gap-2 overflow-hidden">
              <div className="h-10 w-16 shrink-0 rounded-full bg-surface-tertiary" />
              <div className="h-10 w-28 shrink-0 rounded-full bg-surface-tertiary" />
              <div className="h-10 w-24 shrink-0 rounded-full bg-surface-tertiary" />
              <div className="h-10 w-32 shrink-0 rounded-full bg-surface-tertiary" />
            </div>
          </div>
        </div>
        <Divider />

        {/* featured carousel */}
        <div className="mx-auto max-w-360 px-6 py-12 sm:px-10 lg:px-30">
          <div className="grid overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] lg:grid-cols-[1fr_1fr]">
            <div className="aspect-4/3 bg-surface-tertiary lg:aspect-auto lg:h-full" />
            <div className="flex flex-col p-8 sm:p-10">
              <Bar className="h-4 w-44" />
              <Bar className="mt-3 h-8 w-full" />
              <Bar className="mt-2 h-8 w-3/4" />
              <Bar className="mt-4 h-4 w-full" />
              <Bar className="mt-2 h-4 w-5/6" />
              <div className="mt-4 flex gap-2">
                <Bar className="h-6 w-20 rounded-full" />
                <Bar className="h-6 w-24 rounded-full" />
              </div>
              <div className="mt-8 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-surface-tertiary" />
                <div>
                  <Bar className="h-4 w-32" />
                  <Bar className="mt-2 h-3 w-24" />
                </div>
              </div>
              <Bar className="mt-8 h-13.25 w-full rounded-[9px]" />
            </div>
          </div>
        </div>

        {/* latest articles grid */}
        <div className="mx-auto max-w-360 px-6 py-6 pt-0 sm:px-10 lg:px-30 lg:py-8 lg:pt-0">
          <Bar className="h-8 w-56" />
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {CARDS.map((key) => (
              <CardSkeleton key={key} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
