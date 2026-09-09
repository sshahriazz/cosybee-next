import { redirect } from "next/navigation";
import { OnboardingProgress } from "@/app/components/onboarding/OnboardingProgress";
import { BuildingProfileClient } from "@/app/components/onboarding/BuildingProfileClient";
import { AutoCreateProperty } from "@/app/components/onboarding/AutoCreateProperty";
import {
  retrieveAddress,
  searchEpcByPostcode,
  searchEpcByUprn,
} from "@/app/lib/onboarding-actions";
import { resolveEpc } from "@/app/lib/onboarding-epc";
import { requireNoPropertyYet } from "@/app/lib/server-session";

/**
 * Step 2 of onboarding: EPC lookup + property create.
 *
 * Runs as a server component so the opaque AFD `key` from step 1 resolves
 * server-side (the browser never sees the intermediate call), and the EPC
 * lookup piggybacks on the same render pass. A broken `key` (expired,
 * tampered, or hand-typed) bounces the user back to step 1 rather than
 * rendering an empty page.
 *
 * ### Auto-advance vs. picker
 *
 * The mobile app skips this screen entirely when the picked address maps
 * to one obvious EPC (UPRN match → newest cert; postcode fallback → clear
 * best-match by leading house-number). The web mirrors that:
 *
 *   • `resolveEpc({address, certs}).kind === "auto"` — the property is
 *     auto-created client-side (via {@link AutoCreateProperty}) and the
 *     user is forwarded to step 3 with a brief "Setting up your home…"
 *     spinner instead of a "re-pick the EPC you already chose" prompt.
 *   • `"pick"` — genuine ambiguity (multi-EPC postcode with no leading
 *     number match). Render the picker so the user can choose.
 *   • `"none"` — no EPC on the register. Render the no-EPC fallback so the
 *     user can continue with just the address.
 */
export default async function BuildingProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; label?: string }>;
}) {
  // Already-onboarded users don't belong here — the property they'd try
  // to create would collide with the one they already have, and the
  // AutoCreateProperty CONFLICT path only backstops the rare cross-tab
  // race. This gate covers the "bookmark / back button" case up front.
  await requireNoPropertyYet();

  const { key } = await searchParams;
  if (!key) redirect("/onboarding/address");

  const address = await retrieveAddress(key);
  if (!address) redirect("/onboarding/address");

  // UPRN first (one-shot exact match, no neighbour risk). Fall back to
  // postcode for older certificates that predate UPRN indexing on the EPC
  // register (e.g. "1 Hope Street"), then let `resolveEpc` decide whether
  // the postcode fallback is precise enough to auto-continue.
  const hasUprn = address.uprn.trim().length > 0;
  let epcs = hasUprn ? await searchEpcByUprn(address.uprn) : [];
  if (epcs.length === 0 && address.postcode.trim().length > 0) {
    epcs = await searchEpcByPostcode(address.postcode);
  }

  const resolution = resolveEpc(address, epcs);

  if (resolution.kind === "auto") {
    return (
      <>
        <OnboardingProgress
          step={2}
          total={4}
          title="Confirming your home"
          description="We matched your address to a public EPC record. Just a moment…"
        />
        <AutoCreateProperty
          certificateNumber={resolution.certificateNumber}
          nextHref="/onboarding/connect-sunsync"
        />
      </>
    );
  }

  return (
    <>
      <OnboardingProgress
        step={2}
        total={4}
        title="Your building profile"
        description={
          resolution.kind === "pick"
            ? "We found several EPC records for this postcode. Pick your home to pull in its ratings, or continue without an EPC."
            : "We couldn't find an EPC for this postcode. Tell us when your home was built and we'll estimate its rating."
        }
      />
      <BuildingProfileClient address={address} epcs={epcs} />
    </>
  );
}
