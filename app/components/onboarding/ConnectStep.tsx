"use client";

import { useTransition } from "react";
import { Button } from "@heroui/react";
import { Check } from "@gravity-ui/icons";
import { useRouter } from "next/navigation";

/**
 * Layout wrapper for the two provider connect steps in the onboarding
 * funnel (SunSync, Octopus). The provider's connect modal — which owns
 * its own trigger button — is passed in via `children`, and the "Skip
 * for now" affordance sits beside it.
 *
 * Rationale for skipping: the mobile app treats provider connect as
 * optional (Settings → Connected Accounts). The web funnel mirrors that
 * so a user who signed up on desktop without their SunSync password to
 * hand isn't trapped mid-flow — the dashboard's ProviderStatusBar keeps
 * nudging them to complete the missing link.
 *
 * The Skip button uses `useTransition` around `router.push` so the app
 * router marks the next page's render as a transition — `isPending`
 * stays true from click through until that page's server component has
 * finished rendering, which lets us show "Skipping…" + a disabled
 * button rather than a dead click.
 *
 * ### Design notes
 *
 *   • No card. The step's content sits flush with the progress bar and
 *     the title above it, matching step 1 — every step in the funnel
 *     shares one left edge instead of some being inset by a panel.
 *   • `points` replaced a prose paragraph that spent half its words
 *     explaining the Skip button sitting right beneath it.
 *   • Both actions share one row. They used to sit at opposite ends of a
 *     `justify-between`, with the skip button pinned left and a line of
 *     small print floating far right of it.
 */

interface Props {
  /**
   * Provider connect modal (with its own trigger button as its child).
   * Rendered as the primary action.
   */
  children: React.ReactNode;
  /** Where "Skip for now" takes the user (next onboarding step or dashboard). */
  skipHref: string;
  /** Short "what you get" lines shown above the actions. Keep them to a
   *  handful of words each — they are scanned, not read. */
  points?: string[];
}

export function ConnectStep({ children, skipHref, points }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-8">
      {points && points.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2.5 text-sm text-foreground"
            >
              <Check
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-success"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {children}
        <Button
          variant="tertiary"
          isDisabled={pending}
          onPress={() => startTransition(() => router.push(skipHref))}
        >
          {pending ? "Skipping…" : "Skip for now"}
        </Button>
      </div>
    </div>
  );
}
