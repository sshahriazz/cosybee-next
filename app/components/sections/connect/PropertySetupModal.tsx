"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Chip, Modal } from "@heroui/react";
import { House } from "@gravity-ui/icons";
import { TextInputField } from "@/app/components/ui/TextInputField";
import { createProperty } from "@/app/lib/connect-actions";
import type { ConnectResult } from "@/app/lib/connect-actions";

/**
 * Step 1 of onboarding: name the home + address (postcode optional but
 * strongly encouraged so the backend can derive `regionId` for tariff
 * lookups and carbon-intensity queries).
 *
 * The action creates the property AND activates it in one round-trip
 * (see `createProperty` in `app/lib/connect-actions.ts`). On success the
 * Server Action revalidates `/dashboard`, so this modal doesn't
 * need to imperatively close — the page re-renders into the "connect
 * providers" step and the modal unmounts with its trigger.
 */

const INITIAL: ConnectResult | null = null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      variant="primary"
      type="submit"
      isDisabled={pending}
      form="property-setup"
    >
      {pending ? "Saving…" : "Save home"}
    </Button>
  );
}

export function PropertySetupModal({ children }: { children: ReactNode }) {
  const [result, formAction] = useActionState(
    async (_prev: ConnectResult | null, form: FormData) => createProperty(form),
    INITIAL,
  );

  return (
    <Modal>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Backdrop>
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog>
            <Modal.Header className="flex-row items-start gap-3">
              <Modal.Icon className="bg-[color:var(--efh-battery)]/10 text-[color:var(--efh-battery)]">
                <House className="size-5" />
              </Modal.Icon>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Modal.Heading>Set up your home</Modal.Heading>
                  {result?.ok && (
                    <Chip color="success" variant="soft" size="sm">
                      Saved
                    </Chip>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  We&rsquo;ll use this to scope your live data, tariff and
                  carbon-intensity lookups. You can edit any field later.
                </p>
              </div>
            </Modal.Header>

            <Modal.Body>
              <form
                id="property-setup"
                action={formAction}
                className="flex flex-col gap-5"
              >
                {result && !result.ok && (
                  <div
                    role="alert"
                    className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
                  >
                    {result.error}
                  </div>
                )}
                <TextInputField
                  name="label"
                  label="Home name"
                  placeholder="Home"
                  isRequired
                  autoFocus
                  description="Just a label — pick anything memorable. You can rename later."
                />
                <TextInputField
                  name="address"
                  label="Address"
                  placeholder="1 Example Street, City"
                  isRequired
                  description="Full street address. Stored on your account only — never shared with providers."
                />
                <TextInputField
                  name="postcode"
                  label="Postcode"
                  placeholder="SW1A 1AA"
                  autoComplete="postal-code"
                  description="Optional but recommended — lets us fetch your grid region for tariffs and carbon data."
                />
              </form>
            </Modal.Body>

            <Modal.Footer>
              <Modal.CloseTrigger />
              <SubmitButton />
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
