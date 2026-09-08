"use client";

import { useActionState } from "react";
import { Alert, Button } from "@heroui/react";
import { PasswordField } from "@/app/components/ui/PasswordField";
import { unlockSandbox, type UnlockState } from "./actions";

const initialState: UnlockState = {};

/**
 * The access-code form. A Server Action rather than a fetch, so the code is
 * posted straight to the server and never touches client state; the only thing
 * that comes back is a message, and success leaves as a redirect.
 *
 * `from` is where the visitor was going before the gate intervened. It rides
 * along as a hidden field and is re-sanitised server-side.
 *
 * The failure message is an Alert above the field rather than the field's own
 * `isInvalid` / `errorMessage`, and that is not a style choice. HeroUI's
 * TextField validates natively: `isInvalid` calls `setCustomValidity()` on the
 * input, which makes `form.checkValidity()` false and stops the browser
 * submitting. Since the flag here is owned by the server (it can only clear on
 * the next round trip), the form would refuse to submit again — one mistyped
 * code and the visitor is locked out of the gate with no way back in.
 */
export function UnlockForm({ from }: { from: string }) {
  const [state, formAction, isPending] = useActionState(
    unlockSandbox,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="from" value={from} />
      {/* Always rendered, so assistive tech announces the message when it
       *  appears rather than missing a freshly-inserted live region. */}
      <div aria-live="polite">
        {state.error && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{state.error}</Alert.Title>
            </Alert.Content>
          </Alert>
        )}
      </div>
      <PasswordField
        name="password"
        label="Access code"
        autoComplete="current-password"
        isRequired
        autoFocus
      />
      <Button type="submit" className="w-full" isPending={isPending}>
        {isPending ? "Checking…" : "Unlock preview"}
      </Button>
    </form>
  );
}
