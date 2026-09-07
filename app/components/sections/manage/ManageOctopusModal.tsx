"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { Alert, AlertDialog, Button, Spinner, useOverlayState } from "@heroui/react";
import { ThunderboltFill } from "@gravity-ui/icons";
import { disconnectOctopus } from "@/app/lib/provider-actions";

/**
 * Post-connect management dialog for Octopus. Octopus has no "switch
 * account within the same login" concept the way SunSync does — a single
 * Octopus API key maps to one Octopus account — so disconnect is the only
 * action, which makes this a plain confirmation, not a menu.
 *
 * ### Design notes
 *
 *   • ONE step. This used to open a menu whose single card opened a
 *     second confirm screen — two screens, two danger panels and three
 *     paragraphs to answer one yes/no question. The trigger already says
 *     "Manage", so the dialog asks the question directly.
 *   • `AlertDialog`, not `Modal`: `role="alertdialog"`, no backdrop or
 *     ESC dismissal by default, and `AlertDialog.Icon status="danger"`
 *     tints the header from HeroUI's own tokens. The old header reached
 *     for `var(--efh-grid)`, which is scoped to `.efh-scope` in
 *     globals.css — the dialog portals to `document.body`, outside that
 *     scope, so the tint silently resolved to nothing and the bolt sat
 *     on a blank square.
 *   • The dialog IS the warning, so there is no nested danger panel
 *     inside it. Body copy is two short sentences: what gets unlinked,
 *     what survives.
 */

interface Props {
  children: ReactNode;
  propertyLabel?: string | null;
  accountNumber?: string | null;
}

export function ManageOctopusModal({
  children,
  propertyLabel,
  accountNumber,
}: Props) {
  const overlay = useOverlayState();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDisconnect() {
    setError(null);
    startTransition(async () => {
      const result = await disconnectOctopus();
      // Failure keeps the dialog open with the reason attached; success
      // closes it and lets the action's revalidate repaint the page.
      if (!result.ok) setError(result.error);
      else overlay.close();
    });
  }

  return (
    <AlertDialog isOpen={overlay.isOpen} onOpenChange={overlay.setOpen}>
      <AlertDialog.Trigger>{children}</AlertDialog.Trigger>
      <AlertDialog.Backdrop variant="blur">
        <AlertDialog.Container size="sm" placement="center">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger">
                <ThunderboltFill aria-hidden className="size-5" />
              </AlertDialog.Icon>
              <AlertDialog.Heading>Disconnect Octopus?</AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body className="flex flex-col gap-3">
              <p>
                {accountNumber ? (
                  <>
                    Account{" "}
                    <span className="font-medium text-foreground">
                      {accountNumber}
                    </span>{" "}
                    will be unlinked from{" "}
                  </>
                ) : (
                  <>Octopus will be unlinked from </>
                )}
                <span className="font-medium text-foreground">
                  {propertyLabel ?? "this home"}
                </span>
                . Tariff and cost cards fall back to placeholders; your
                historical readings are kept.
              </p>

              {error && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </AlertDialog.Body>

            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" isDisabled={pending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onPress={handleDisconnect}
                isDisabled={pending}
              >
                {pending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Disconnecting…
                  </>
                ) : (
                  "Disconnect"
                )}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
