"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { OnboardingProgress } from "@/app/components/onboarding/OnboardingProgress";
import { AddressSearch } from "@/app/components/onboarding/AddressSearch";

/**
 * Client half of step 1. Kept separate so the page.tsx can stay a server
 * component and run the "already onboarded → bounce to dashboard" gate
 * before any UI mounts. On pick, pushes to
 * `/onboarding/building-profile?key=<opaque AFD key>&label=<display>` —
 * the opaque key is what the next step re-retrieves the full address
 * from, so the browser back button behaves and a shared/refreshed URL
 * still works.
 *
 * The navigation runs inside `useTransition` so `isPending` covers the
 * full "picked → next server-rendered step is ready" window, and the
 * field swaps to a "Looking up your home…" line instead of leaving the
 * user staring at their search box for 1–2 s while the EPC lookup runs.
 *
 * ### Design notes
 *
 * The step is one labelled field, flush with the heading above it. It
 * used to be a `Card` holding an icon row that repeated the label, the
 * field, and an `Alert` that repeated the page subtitle — a lot of
 * chrome around a single input. The card is gone, so the field aligns
 * with the progress bar and the title on the same left edge.
 */
export function AddressStepClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <OnboardingProgress
        step={1}
        total={4}
        title="Where do you live?"
        description="We use your address to find your home's EPC and your local tariff rates."
      />

      {pending ? (
        <div role="status" className="flex items-center gap-3">
          <Spinner size="sm" />
          <p className="text-sm text-muted">
            Looking up your home — fetching the EPC record…
          </p>
        </div>
      ) : (
        <AddressSearch
          autoFocus
          label="Address or postcode"
          description="Start typing, then pick your home from the list."
          onPick={(key, label) => {
            const q = new URLSearchParams({ key, label }).toString();
            startTransition(() =>
              router.push(`/onboarding/building-profile?${q}`),
            );
          }}
        />
      )}
    </>
  );
}
