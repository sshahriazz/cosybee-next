import { Button } from "@heroui/react";
import { OnboardingProgress } from "@/app/components/onboarding/OnboardingProgress";
import { ConnectStep } from "@/app/components/onboarding/ConnectStep";
import { ConnectOctopusModal } from "@/app/components/sections/connect/ConnectOctopusModal";

/**
 * Step 4 of onboarding: connect Octopus. Reuses the existing modal (same
 * rationale as the SunSync step above) and hands off to the dashboard on
 * either "Skip for now" or a successful connect. From here the funnel is
 * done and the user lives on `/energyflow-home`.
 */
export default function ConnectOctopusStep() {
  return (
    <>
      <OnboardingProgress
        step={4}
        total={4}
        title="Connect your tariff"
        description="Link your Octopus account to see what your energy actually costs."
      />
      <ConnectStep
        skipHref="/energyflow-home"
        points={[
          "Your live unit rate and standing charge",
          "Daily cost from your real consumption",
          "About 13 months of history, back-filled once",
        ]}
      >
        <ConnectOctopusModal successHref="/energyflow-home">
          <Button variant="primary" size="lg">
            Connect Octopus
          </Button>
        </ConnectOctopusModal>
      </ConnectStep>
    </>
  );
}
