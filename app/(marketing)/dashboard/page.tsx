import type { Metadata } from "next";
import { pageMetadata } from "@/app/lib/seo";
import JsonLd from "@/app/components/JsonLd";
import { breadcrumbSchema } from "@/app/lib/structured-data";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { requireOnboarded } from "@/app/lib/server-session";
import { getConnectionState } from "@/app/lib/connection-state";
import { getActiveProperty, listProperties } from "@/app/lib/property-state";
import type { ActiveProperty } from "@/app/lib/property-state";
import { getLiveDashboardData } from "@/app/lib/dashboard-data";
import type { EnergyFlowFetchResult } from "@/app/lib/energy-flow";
import type { DashboardData } from "@/app/components/sections/energyflow-home";
import {
  ConnectionEmptyState,
  DailyCostCard,
  DashboardHeader,
  DashboardShell,
  EnergyFlowDiagram,
  OctopusBackfillWatcher,
  PowerHistoryChart,
  ProviderStatusBar,
  StatStrip,
  SyncingDataBanner,
  TariffCard,
  getDashboardData,
} from "@/app/components/sections/energyflow-home";

export const metadata: Metadata = pageMetadata({
  title: "Energy Flow Dashboard",
  description:
    "Live view of solar, battery, grid, and home energy movement — see how your home balances every watt in real time.",
  path: "/dashboard",
});

/**
 * `/dashboard` — public dashboard view. Composed from the
 * `sections/energyflow-home` module: the page owns nothing but layout and
 * data fetching, so future work (live data, per-day navigation, additional
 * panels) happens inside the module without touching this file.
 *
 * ### Render paths
 *
 *   1. Not logged in            → `requireUser()` redirects to `/login`.
 *   2. `?demo=1`                → hardcoded demo dashboard, static, for
 *                                 marketing / design preview.
 *   3. No SunSync, no Octopus   → Tier-0 empty state with modal CTAs.
 *   4. At least one connected   → {@link DashboardShell}, the interactive
 *                                 client component that owns day state
 *                                 and drives the header, stats and chart
 *                                 together.
 *
 * Partial connections (SunSync-only or Octopus-only) still land on the
 * real dashboard — the section components will surface "Add your Octopus
 * tariff to unlock cost" affordances once the remaining data lands.
 */
export default async function EnergyFlowHomePage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;
  const showDemo = demo === "1";

  // Redirects to /login when there's no session, or to /onboarding/address
  // when the signed-in user hasn't created a home yet. Admins are exempt
  // from the onboarding gate so support access still works. The redirect
  // path returns the user here after login.
  await requireOnboarded("/dashboard");

  const wrapper = (children: React.ReactNode) => (
    <div className="efh-scope bg-background text-foreground">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Energy Flow Dashboard", path: "/dashboard" },
        ])}
      />
      {/* `spacing="sm"` (py-12 lg:py-16) instead of the marketing-band
          default `md` (py-16 lg:py-20). Dashboards read better with less
          empty air above the first card — the marketing sizing pushed the
          Sunsynk/Octopus row a screenful below the header. */}
      <Section spacing="sm" surface="base">
        <Container size="wide">{children}</Container>
      </Section>
    </div>
  );

  if (showDemo) return wrapper(<DemoDashboard data={getDashboardData()} />);

  // Real connection state — one round-trip to each provider status endpoint,
  // memoised so re-reads within this render don't hit the backend twice.
  // Property state runs alongside so the empty state can gate the provider
  // step on whether the user has a home configured yet.
  const [{ sunsync, octopus }, property, properties] = await Promise.all([
    getConnectionState(),
    getActiveProperty(),
    listProperties(),
  ]);
  const anyConnected = sunsync.connected || octopus.connected;

  if (!anyConnected)
    return wrapper(
      <ConnectionEmptyState demoHref="?demo=1" hasProperty={property !== null} />,
    );

  // Live data — server pre-fetches today's flow, history and stats so the
  // client shell paints in one shot. The shell then handles date navigation
  // on the client without a page reload.
  const { data, liveFields, activePropertyId, todayIso } =
    await getLiveDashboardData();
  const stillSyncing =
    !liveFields.tariff ||
    !liveFields.cost ||
    !liveFields.stats ||
    !liveFields.history.live;

  // Freshly-linked Sunsynk backfill signal. The backend fires up to 90 days
  // of 5-minute intraday sync as fire-and-forget on connect (see
  // sunsynk.connection.ts); until it finishes, the dashboard shows
  // Connected but every kWh tile reads 0.0 and the chart has one dot.
  // Trigger the banner when: Sunsynk connected, and either we haven't
  // synced telemetry yet OR the returned history has almost no points.
  // Conservative bounds so a genuine low-activity day doesn't show it.
  const historyPointCount = data.history.points.length;
  const showBackfillBanner =
    sunsync.connected &&
    (sunsync.lastSyncedAt === null || historyPointCount < 3);

  // Freshly-linked Octopus back-fill signal — the provider tile shows
  // "Back-filling your history…" until this flips to true. Handing it to
  // the silent watcher below triggers `router.refresh()` on an interval
  // while incomplete, so the tile / cost card / stats auto-fill on
  // completion without a manual reload.
  const octopusBackfilling = octopus.connected && !octopus.backfillComplete;

  return wrapper(
    <div className="flex flex-col gap-4">
      {/* Persistent connections strip — makes the second provider reachable
          from inside the connected tier. Without this the dashboard hid
          the Connect CTAs once ANY provider was linked, which meant you
          could connect Octopus first and then have no way to add SunSync
          from the page. */}
      <ProviderStatusBar sunsync={sunsync} octopus={octopus} />

      {/* Behaviour-only: refreshes the page while Octopus is still back-
          filling so the Octopus tile subtitle flips from
          "Back-filling your history…" to "Account A-XXXXXXXX" and the
          cost card / stat strip pick up the newly-synced numbers without
          the user reloading. Renders nothing when idle or complete. */}
      <OctopusBackfillWatcher isBackfilling={octopusBackfilling} />

      {showBackfillBanner && <SyncingDataBanner />}

      {stillSyncing && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
          <span className="mt-0.5 inline-block size-2 shrink-0 rounded-full bg-warning" />
          <span>
            {liveFields.flow.live ? "Showing live power flow. " : ""}
            {(() => {
              const pending = [
                liveFields.tariff ? null : "tariff",
                liveFields.cost ? null : "cost",
                liveFields.stats ? null : "stats",
                liveFields.history.live ? null : "history",
              ].filter((s): s is string => s !== null);
              const verb = pending.length === 1 ? "is" : "are";
              return `${joinWithAnd(pending)} ${verb}`;
            })()}{" "}
            still on demo values while we finish wiring those to your
            account.
          </span>
        </div>
      )}

      <DashboardShell
        data={data}
        flowLive={liveFields.flow.live}
        flowResult={liveFields.flow.result}
        properties={properties}
        activePropertyId={activePropertyId}
        historyLive={liveFields.history.live}
        todayIso={todayIso}
      />
    </div>,
  );
}

/**
 * The `?demo=1` preview — static, no polling, no date navigation. Kept
 * separate from the live shell because the demo has no `todayIso` (it's
 * frozen fixture data) and wiring a date navigator across a frozen fixture
 * would just render broken empty states on prev/next.
 */
function DemoDashboard({ data }: { data: DashboardData }) {
  const now = new Date();
  const properties: ActiveProperty[] = [];
  const flowResult: EnergyFlowFetchResult | null = null;
  return (
    <div className="flex flex-col gap-4">
      <DashboardHeader
        achievement={data.achievement}
        dayLabel={data.dayLabel}
        properties={properties}
        activePropertyId={null}
      />
      <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
        <div className="lg:col-span-2 flex">
          <EnergyFlowDiagram flow={data.flow} now={now} />
        </div>
        <div className="grid gap-4 lg:grid-rows-[auto_1fr]">
          <TariffCard tariff={data.tariff} />
          <DailyCostCard cost={data.cost} />
        </div>
      </div>
      <StatStrip stats={data.stats} />
      <PowerHistoryChart history={data.history} />
      {/* Silence "flowResult unused" — kept for shape parity with the
          live path in case future demo tweaks want to render a specific
          failure branch. */}
      {flowResult}
    </div>
  );
}

/**
 * "Tariff, cost and history" — sentence-cased on the first field, so it
 * reads correctly at the start of the banner ("Tariff still on demo…").
 * Empty input returns the empty string; the caller only mounts the banner
 * when at least one item is pending, so this shouldn't be reached with an
 * empty list.
 */
function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  const capitalised = items.map((s, i) =>
    i === 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s,
  );
  if (capitalised.length === 1) return capitalised[0]!;
  if (capitalised.length === 2) return `${capitalised[0]} and ${capitalised[1]}`;
  return `${capitalised.slice(0, -1).join(", ")} and ${capitalised.at(-1)}`;
}
