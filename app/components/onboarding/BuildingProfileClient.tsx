"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Chip,
  Description,
  Label,
  Radio,
  RadioGroup,
} from "@heroui/react";
import {
  createPropertyFromEpc,
  createPropertyWithoutEpc,
  type EpcCertificateRow,
  type ResolvedAddress,
} from "@/app/lib/onboarding-actions";
import { CONSTRUCTION_ERAS } from "@/app/lib/epc-field-options";

/**
 * Client half of the building-profile step, rendered ONLY on the two
 * branches that need user input — the unambiguous "auto-continue" case
 * is handled upstream by {@link AutoCreateProperty} (see
 * `building-profile/page.tsx` and `resolveEpc` in
 * `app/lib/onboarding-epc.ts`), so this component never sees a one-EPC
 * or clear-best-match input.
 *
 *   • `epcs.length > 1` — postcode fallback returned several rows with
 *     no leading-house-number match. User picks from the list.
 *   • `epcs.length === 0` — no EPC on the register. User answers when the
 *     home was built and we estimate the rating from that.
 *
 * Either branch can also flip into the no-EPC fallback via a link, so a
 * multi-row postcode result isn't a dead end for someone whose home
 * genuinely isn't in the list.
 *
 * ### Design notes
 *
 * Flush with the progress bar and title, like every other step — no
 * wrapping panel. The two hand-rolled status boxes (a red div and an
 * amber one) are HeroUI `Alert`s now, so failures and the no-EPC
 * fallback look the same here as they do in the connect dialogs.
 */

interface Props {
  address: ResolvedAddress;
  epcs: EpcCertificateRow[];
}

export function BuildingProfileClient({ address, epcs }: Props) {
  const router = useRouter();
  const [certificateNumber, setCertificateNumber] = useState<string>(
    epcs[0]?.certificateNumber ?? "",
  );
  const [useNoEpc, setUseNoEpc] = useState(epcs.length === 0);
  // The one question the no-EPC path asks. Onboarding deliberately stops
  // here: the backend fills the remaining eight answers from era-typical
  // values, and the resident can refine them later. Asking more would grow
  // the funnel without improving the estimate much.
  const [constructionEra, setConstructionEra] = useState("");
  // Default label — the customer-facing rename lives in the account area,
  // not the onboarding funnel, so the step doesn't ask for it here.
  const label = "Home";
  // True on both routes into the no-EPC branch: no certificates at all, or
  // the user opting out of a list that didn't include their home.
  const noEpcPath = epcs.length === 0 || useNoEpc;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Separate transition for the "Change" back-navigation so the primary
  // "Continue" spinner isn't confused with a plain route change.
  const [navigating, startNavigation] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = useNoEpc
        ? await createPropertyWithoutEpc({
            label,
            address: displayAddress(address),
            postcode: address.postcode,
            constructionEra,
            uprn: address.uprn,
            latitude: address.latitude,
            longitude: address.longitude,
          })
        : await createPropertyFromEpc({ certificateNumber, label });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/onboarding/connect-sunsync");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selected address summary — the user can click "Change" to go back
          to step 1 if they picked the wrong one. */}
      <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-secondary px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium text-muted">Your home</p>
          <p className="text-sm font-medium text-foreground">
            {displayAddress(address)}
          </p>
          <p className="text-xs text-muted">{address.postcode}</p>
        </div>
        <Button
          variant="tertiary"
          size="sm"
          isDisabled={navigating || pending}
          onPress={() =>
            startNavigation(() => router.push("/onboarding/address"))
          }
        >
          {navigating ? "Loading…" : "Change"}
        </Button>
      </div>

      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {epcs.length > 1 && !useNoEpc && (
        <div className="flex flex-col gap-3">
          <RadioGroup
            aria-label="EPC certificate"
            value={certificateNumber}
            onChange={setCertificateNumber}
            className="flex flex-col gap-2"
          >
            <Label>Which one is your home?</Label>
            {epcs.map((cert) => (
              <Radio key={cert.certificateNumber} value={cert.certificateNumber}>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">
                    {cert.address ?? cert.certificateNumber}
                    {cert.currentEnergyRating && (
                      <Chip color="default" variant="soft" size="sm" className="ml-2">
                        Rating {cert.currentEnergyRating}
                      </Chip>
                    )}
                  </span>
                  <span className="text-xs text-muted">
                    {[cert.propertyType, cert.builtForm, cert.totalFloorArea && `${cert.totalFloorArea} m²`]
                      .filter(Boolean)
                      .join(" · ")}
                    {cert.lodgementDate && ` · Lodged ${cert.lodgementDate}`}
                  </span>
                </div>
              </Radio>
            ))}
          </RadioGroup>
          <button
            type="button"
            onClick={() => setUseNoEpc(true)}
            className="self-start text-xs text-muted underline underline-offset-2 hover:text-foreground"
          >
            None of these are my home — continue without an EPC
          </button>
        </div>
      )}

      {(epcs.length === 0 || useNoEpc) && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              {epcs.length === 0
                ? "No EPC on the register for this postcode"
                : "Continuing without an EPC"}
            </Alert.Title>
            <Alert.Description>
              We&apos;ll estimate your home&apos;s rating instead. Answer one
              question below and you can refine it later.
            </Alert.Description>
            {epcs.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 self-start"
                onPress={() => setUseNoEpc(false)}
              >
                Pick from the EPC list instead
              </Button>
            )}
          </Alert.Content>
        </Alert>
      )}

      {noEpcPath && (
        <RadioGroup
          className="flex flex-col gap-2"
          value={constructionEra}
          onChange={setConstructionEra}
        >
          <Label>When was your home built?</Label>
          <Description>
            Its age tells us most of what we need to estimate your rating.
          </Description>
          {CONSTRUCTION_ERAS.map((era) => (
            <Radio key={era.value} value={era.value}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {era.label}
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>
      )}

      <Button
        className="self-start"
        variant="primary"
        onPress={handleCreate}
        isDisabled={
          pending ||
          (noEpcPath
            ? constructionEra.length === 0
            : certificateNumber.length === 0)
        }
      >
        {pending ? "Setting up your home…" : "Continue"}
      </Button>
    </div>
  );
}

/**
 * Full postal line for the confirmation summary — and for the address we
 * persist on the no-EPC create path.
 *
 * AFD splits the building off the street: "1 Gorple Cottages" arrives in
 * `property` while `street` is just "Wallhurst Close". Starting the line
 * at `street` therefore renders every home on the close identically, so
 * the user can't tell whether we resolved the address they picked. Lead
 * with `organisation` / `property` when AFD supplies them; for plain
 * numbered addresses both are empty and the number is already inside
 * `street`, so the output is unchanged.
 */
function displayAddress(addr: ResolvedAddress): string {
  return [
    addr.organisation,
    addr.property,
    addr.street,
    addr.locality,
    addr.town,
    addr.county,
  ]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join(", ");
}
