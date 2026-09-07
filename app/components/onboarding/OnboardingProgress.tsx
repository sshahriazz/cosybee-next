import { ProgressBar } from "@heroui/react";

/**
 * Shared step header for the onboarding funnel.
 *
 * Renders "Step N of TOTAL" text above a HeroUI `ProgressBar`. Both step
 * values are explicit (not derived from the URL) so a step can be
 * rearranged / inserted / removed by editing just the page that
 * instantiates this — no cross-file if-ladder.
 *
 * Uses `ProgressBar.Root` + `Track` + `Fill` composition rather than a
 * bespoke `<div>` bar so the funnel picks up HeroUI's theme tokens
 * (accent colour, motion, sizing) and stays visually consistent with the
 * rest of the app's progress affordances.
 *
 * The percentage used to be printed opposite the step count, which said
 * the same thing three ways — "Step 1 of 4", "25%", and the bar itself.
 * It now lives only in the bar's ARIA value, where it costs no ink.
 */

interface Props {
  step: number;
  total: number;
  title: string;
  description?: string;
}

export function OnboardingProgress({ step, total, title, description }: Props) {
  const pct = Math.max(0, Math.min(100, (step / total) * 100));
  return (
    <div className="mb-8 flex flex-col gap-6">
      <ProgressBar
        value={pct}
        color="accent"
        size="sm"
        aria-label="Onboarding progress"
      >
        <p className="mb-2 text-xs font-medium text-muted">
          Step {step} of {total}
        </p>
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-prose text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
