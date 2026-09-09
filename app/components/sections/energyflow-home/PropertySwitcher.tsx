"use client";

import { useState, useTransition } from "react";
import { Button, Chip, Modal, Radio, RadioGroup } from "@heroui/react";
import { HouseFill } from "@gravity-ui/icons";
import { activateProperty } from "@/app/lib/property-actions";
import type { ActiveProperty } from "@/app/lib/property-state";

/**
 * Home picker for users with more than one property.
 *
 * A trigger button in the dashboard header opens a modal listing the user's
 * non-archived homes. Selecting a different one calls
 * `POST /api/properties/:id/activate` (via the server action), which primes
 * the backend's session state so every subsequent request resolves to the
 * new home — matching how the mobile app's Dio interceptor pins each call
 * to the active property.
 *
 * Single-property users don't see the modal (the trigger just renders the
 * home's label as a passive chip) — the interaction only exists where it
 * matters.
 *
 * Close-on-success: `activateProperty` calls `revalidatePath("/dashboard")`
 * which re-renders the page against the newly active home. The modal stays
 * mounted unless the user closes it — same behaviour as the existing
 * ConnectSunSyncModal, so this stays consistent with the rest of the app.
 */

interface Props {
  properties: ActiveProperty[];
  activeId: string | null;
}

export function PropertySwitcher({ properties, activeId }: Props) {
  const [selected, setSelected] = useState<string>(activeId ?? properties[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (properties.length === 0) return null;

  const active = properties.find((p) => p.id === activeId) ?? properties[0];
  const chipLabel = active?.label ?? "Home";

  // A passive chip when there's only one property — no useless modal to open.
  if (properties.length === 1) {
    return (
      <Chip color="default" variant="soft" size="md">
        <HouseFill className="mr-1 inline size-4 align-middle" />
        {chipLabel}
      </Chip>
    );
  }

  function handleSwitch() {
    if (selected === activeId) return;
    setError(null);
    startTransition(async () => {
      const result = await activateProperty(selected);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Modal>
      <Modal.Trigger>
        <Button size="sm" variant="tertiary">
          <HouseFill className="mr-1.5 inline size-4 align-middle" />
          {chipLabel}
        </Button>
      </Modal.Trigger>
      <Modal.Backdrop>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Switch home</Modal.Heading>
              <p className="mt-1 text-sm text-muted">
                Every card on this dashboard reads the ACTIVE home. Pick a
                different one to reload the whole view against its data.
              </p>
            </Modal.Header>
            <Modal.Body>
              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
                >
                  {error}
                </div>
              )}
              <RadioGroup
                aria-label="Home"
                value={selected}
                onChange={setSelected}
                className="flex flex-col gap-2"
              >
                {properties.map((p) => (
                  <Radio key={p.id} value={p.id}>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {p.label}
                        {p.id === activeId && (
                          <Chip color="success" variant="soft" size="sm" className="ml-2">
                            Active
                          </Chip>
                        )}
                      </span>
                      <span className="text-xs text-muted">
                        {p.address}
                        {p.postcode ? ` · ${p.postcode}` : ""}
                      </span>
                    </div>
                  </Radio>
                ))}
              </RadioGroup>
            </Modal.Body>
            <Modal.Footer>
              <Modal.CloseTrigger />
              <Button variant="primary" onPress={handleSwitch} isDisabled={pending}>
                {pending ? "Switching…" : "Switch home"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
