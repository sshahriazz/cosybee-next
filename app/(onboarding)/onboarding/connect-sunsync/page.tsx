import { Button } from "@heroui/react";
import { OnboardingProgress } from "@/app/components/onboarding/OnboardingProgress";
import { ConnectStep } from "@/app/components/onboarding/ConnectStep";
import { ConnectSunSyncModal } from "@/app/components/sections/connect/ConnectSunSyncModal";

/**
 * Step 3 of onboarding: connect SunSync.
 *
 * Reuses the existing `ConnectSunSyncModal` (which owns the full multi-
 * step credential + plant + inverter picker) rather than reimplementing
 * the flow. The user opens the modal, completes it, and either the
 * successful revalidatePath from the modal + navigation forward here, or
 * they hit "Skip for now" and land on the next step.
 *
 * Reuse-not-inline note: rendering the modal inline as a page would
 * require pulling `useActionState` + the full picker markup out of the
 * modal component, which is a large refactor for zero UX gain. The one
 * modal serves both the dashboard's ProviderStatusBar and this onboarding
 * step — one source of truth for the connect flow.
 */
export default function ConnectSunSyncStep() {
  return (
    <>
      <OnboardingProgress
        step={3}
        total={4}
        title="Connect your solar inverter"
        description="Link your Sunsynk account to watch power move around your home."
      />
      <ConnectStep
        skipHref="/onboarding/connect-octopus"
        points={[
          "Live solar, battery, grid and home flow",
          "Today's generation and battery charge",
          "Updates every few minutes, on its own",
        ]}
      >
        <ConnectSunSyncModal successHref="/onboarding/connect-octopus">
          <Button variant="primary" size="lg">
            Connect Sunsynk
          </Button>
        </ConnectSunSyncModal>
      </ConnectStep>
    </>
  );
}
