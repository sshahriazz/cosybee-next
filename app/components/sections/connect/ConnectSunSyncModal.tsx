"use client";
"use no memo";

import type { ReactNode } from "react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Description,
  Fieldset,
  Form,
  Label,
  ListBox,
  Modal,
  Spinner,
  useOverlayState,
} from "@heroui/react";
import {
  Check,
  CircleCheckFill,
  Cpu,
  Envelope,
  House,
  ShieldCheck,
  Sun,
} from "@gravity-ui/icons";
import { TextInputField } from "@/app/components/ui/TextInputField";
import { PasswordField } from "@/app/components/ui/PasswordField";
import { connectSunSync } from "@/app/lib/connect-actions";
import type { SunSyncConnectResult } from "@/app/lib/connect-actions";

/**
 * SunSync credential dialog with an inline plant / inverter picker.
 *
 * The flow can take 1, 2 or 3 submits depending on the shape of the
 * Sunsynk account:
 *
 *   1 submit  — one site, one inverter → straight through.
 *   2 submits — multiple sites → picker → second POST with `plantId`.
 *   3 submits — multiple sites AND the chosen one has multiple
 *               inverters → plant picker → inverter picker → final POST.
 *
 * The credential fields (email + password) stay mounted across every
 * step, so re-submitting after a picker re-uses whatever the user typed
 * originally — no need to hold credentials in React state or ferry them
 * through hidden inputs.
 *
 * ### Design notes
 *
 *   • EVERY colour here is a HeroUI semantic token. The dialog portals to
 *     `document.body`, which sits OUTSIDE the `.efh-scope` wrapper that
 *     defines `--efh-solar` and friends (app/globals.css) — an earlier
 *     revision tinted the header icon and the active step dot with
 *     `var(--efh-solar)` and both rendered as *nothing*, because the
 *     custom property does not resolve in the portal. `warning-soft`
 *     carries the same warm-amber "solar" reading and resolves anywhere.
 *   • ONE focal block per step: credentials, plant picker, or inverter
 *     picker. Non-current-step markup is `hidden` — still in the DOM so
 *     its FormData values survive re-submits.
 *   • The stepper stays mounted through loading and success so the
 *     dialog keeps a stable anchor instead of re-shuffling under the
 *     user mid-request.
 *   • Loading uses a centred `Spinner` + rotating ladder of honest
 *     messages — Sunsynk's round-trip is a genuine 3–8 s.
 *   • Errors are a HeroUI `Alert status="danger"`, success a matching
 *     `success-soft` card, so feedback shares one visual grammar.
 */

const INITIAL: SunSyncConnectResult | null = null;
const FORM_ID = "connect-sunsync";

/**
 * Extract the single selected key from react-aria's `Selection` shape
 * (`"all" | Set<Key>`). Our ListBox uses `selectionMode="single"` so
 * `"all"` never fires and the Set holds 0 or 1 entries. Returns `null`
 * when nothing is selected, so callers can gate on truthiness.
 */
function firstKey(selection: "all" | Set<React.Key>): string | null {
  if (selection === "all") return null;
  const first = selection.values().next().value;
  return typeof first === "string" ? first : null;
}

/** One of the three logical steps in the flow. */
type Step = "credentials" | "plant" | "inverter";

const STEPS: { key: Step; label: string }[] = [
  { key: "credentials", label: "Sign in" },
  { key: "plant", label: "Site" },
  { key: "inverter", label: "Inverter" },
];

/**
 * Progress rail across the top of the body. Completed steps collapse to
 * a check, the current step carries a focus ring, upcoming steps sit on
 * `default` so they read as inert. Connectors are `flex-1` so the rail
 * spans the dialog at any width.
 *
 * The Site / Inverter dots only ever light up when the account actually
 * surfaces those pickers — for a single-site / single-inverter Sunsynk
 * account the flow completes on step 1 and `isDone` fills the whole rail
 * in one go, which is honest: nothing was skipped, there was nothing to
 * pick.
 */
function Stepper({ step, isDone }: { step: Step; isDone: boolean }) {
  const activeIdx = isDone
    ? STEPS.length
    : STEPS.findIndex((s) => s.key === step);

  return (
    <ol aria-label="Connection progress" className="flex w-full items-center">
      {STEPS.map((s, i) => {
        const done = i < activeIdx;
        const current = i === activeIdx;
        const isLast = i === STEPS.length - 1;
        return (
          <li
            key={s.key}
            aria-current={current ? "step" : undefined}
            className={`flex items-center gap-2 ${isLast ? "" : "flex-1"}`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors ${
                done
                  ? "bg-accent-soft text-accent-soft-foreground"
                  : current
                    ? "bg-accent text-accent-foreground ring-4 ring-accent-soft"
                    : "bg-default text-muted"
              }`}
            >
              {done ? <Check aria-hidden className="size-3.5" /> : i + 1}
            </span>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                current ? "text-foreground" : "text-muted"
              }`}
            >
              {s.label}
            </span>
            {!isLast && (
              <span
                aria-hidden
                className={`mx-2 h-px flex-1 transition-colors ${
                  done ? "bg-accent-soft" : "bg-separator"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Centred loading state. Sunsynk's API is genuinely slow (3–8 s on a
 * good day). A cycling ladder of honest labels tells the customer WHAT
 * we're doing so a long wait doesn't read as "nothing happened". The
 * last message stays put so we never spin the label forever.
 */
const SYNC_MESSAGES = [
  "Signing in to Sunsynk…",
  "Fetching your site…",
  "Linking your inverter…",
  "Still working — Sunsynk can be slow at times…",
];

function LoadingCard() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= SYNC_MESSAGES.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 2000);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface-secondary px-6 py-10 text-center"
    >
      <Spinner size="lg" />
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-foreground">
          Talking to Sunsynk
        </p>
        <p aria-live="polite" className="text-sm text-muted">
          {SYNC_MESSAGES[step]}
        </p>
      </div>
    </div>
  );
}

function SuccessCard() {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-success-soft px-6 py-10 text-center"
    >
      <CircleCheckFill aria-hidden className="size-8 text-success" />
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-foreground">Sunsynk linked</p>
        <p className="text-sm text-muted">Taking you to the next step…</p>
      </div>
    </div>
  );
}

/**
 * Shared chrome for the two picker steps — a labelled, scroll-capped
 * ListBox on its own surface. Both pickers are single-select and feed a
 * hidden input, so the only things that vary are the legend, the items
 * and the selection handler.
 */
function PickerFieldset({
  legend,
  hint,
  ariaLabel,
  selected,
  onSelect,
  fieldName,
  children,
}: {
  legend: string;
  hint: string;
  ariaLabel: string;
  selected: string | null;
  onSelect: (key: string | null) => void;
  fieldName: string;
  children: ReactNode;
}) {
  return (
    <Fieldset className="flex flex-col gap-2">
      <Fieldset.Legend>{legend}</Fieldset.Legend>
      <p className="text-xs text-muted">{hint}</p>
      <ListBox
        aria-label={ariaLabel}
        selectionMode="single"
        selectedKeys={selected ? new Set([selected]) : new Set()}
        onSelectionChange={(keys) => onSelect(firstKey(keys))}
        className="max-h-64 overflow-y-auto rounded-2xl border border-border bg-surface shadow-xs"
      >
        {children}
      </ListBox>
      <input type="hidden" name={fieldName} value={selected ?? ""} />
    </Fieldset>
  );
}

export function ConnectSunSyncModal({
  children,
  successHref,
}: {
  children: ReactNode;
  /**
   * Where to send the user after a successful connect. When set, the modal
   * closes and navigates to this URL as soon as the connect flow returns
   * `ok:true` — used by the onboarding funnel to advance to the next step.
   * Unset when the modal is opened from the dashboard: revalidatePath in
   * the action already updates the current page, so we just close.
   */
  successHref?: string;
}) {
  const [result, formAction, isPending] = useActionState(
    async (_prev: SunSyncConnectResult | null, form: FormData) =>
      connectSunSync(form),
    INITIAL,
  );
  const overlay = useOverlayState();
  const router = useRouter();

  const pickingPlant = result !== null && "pickPlant" in result;
  const pickingInverter = result !== null && "pickInverter" in result;
  const succeeded = result !== null && result.ok === true;
  const genericError =
    result !== null && !result.ok && "error" in result ? result.error : null;

  const currentStep: Step = pickingInverter
    ? "inverter"
    : pickingPlant
      ? "plant"
      : "credentials";

  // Track picker selection locally so the submit button can be disabled
  // until the user actually chooses. Reset whenever the step changes so
  // the button re-locks on entry.
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [selectedInverter, setSelectedInverter] = useState<string | null>(null);
  useEffect(() => {
    if (pickingPlant) setSelectedPlant(null);
  }, [pickingPlant]);
  useEffect(() => {
    if (pickingInverter) setSelectedInverter(null);
  }, [pickingInverter]);

  // On success: close the modal and (in onboarding) navigate forward.
  const { close } = overlay;
  useEffect(() => {
    if (!succeeded) return;
    const t = setTimeout(() => {
      close();
      if (successHref) router.push(successHref);
    }, 900);
    return () => clearTimeout(t);
  }, [succeeded, successHref, close, router]);

  const blurb =
    currentStep === "plant"
      ? "Pick the home this dashboard should read."
      : currentStep === "inverter"
        ? "Pick the inverter whose telemetry drives this dashboard."
        : "Sign in with the same account you use for the Sunsynk app.";

  const submitLabel =
    currentStep === "plant"
      ? "Link this site"
      : currentStep === "inverter"
        ? "Link this inverter"
        : "Continue";

  // Credentials mounted for every step so re-submits carry them. Hidden
  // while the pickers or a syncing / success state own the body.
  const showCredentialsInBody =
    currentStep === "credentials" && !isPending && !succeeded;
  const showPlantInBody = currentStep === "plant" && !isPending && !succeeded;
  const showInverterInBody =
    currentStep === "inverter" && !isPending && !succeeded;

  // Submit button disabled when: action in flight, or the active picker
  // step has no selection. Credentials step relies on browser required-
  // field validation instead.
  const submitDisabled =
    isPending ||
    (currentStep === "plant" && !selectedPlant) ||
    (currentStep === "inverter" && !selectedInverter);

  return (
    <Modal state={overlay}>
      <Modal.Trigger>{children}</Modal.Trigger>
      {/* Outside-click dismissal is off while a request is in flight, so a
          stray click can't bin credentials the user already typed. The
          footer's Cancel stays live throughout — there is always a
          deliberate way out. */}
      <Modal.Backdrop variant="blur" isDismissable={!isPending}>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            {/* Form wraps every Modal slot so `type="submit"` on the
                footer button is a natural form descendant. The gap lives
                here because `.modal__header/body/footer` ship with zeroed
                margins and the dialog itself has no row gap.

                🔴 `onSubmit` + `startTransition(() => formAction(fd))`
                instead of `<Form action={formAction}>`. React 19 auto-
                resets any form bound via the `action` prop as soon as
                the action returns; our multi-step flow returns
                `{pickPlant:[…]}` on pass 1, and the auto-reset would
                wipe the (hidden) credentials before pass 2. `formAction`
                from `useActionState` must be called inside a transition
                when dispatched manually — otherwise `isPending` never
                flips and React logs a warning. */}
            <Form
              id={FORM_ID}
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(() => {
                  formAction(fd);
                });
              }}
            >
              {/* `pe-10` keeps the copy clear of the absolutely-positioned
                  close button in the top-right corner. */}
              <Modal.Header className="flex-row items-start gap-3 pe-10">
                <Modal.Icon className="bg-warning-soft text-warning-soft-foreground">
                  <Sun aria-hidden className="size-5" />
                </Modal.Icon>
                <div className="flex flex-1 flex-col gap-1">
                  <Modal.Heading>Connect Sunsynk</Modal.Heading>
                  <p className="text-sm leading-5 text-muted">{blurb}</p>
                </div>
              </Modal.Header>

              <Modal.Body className="flex flex-col gap-5">
                <Stepper step={currentStep} isDone={succeeded} />

                {isPending && <LoadingCard />}
                {succeeded && <SuccessCard />}

                {!isPending && !succeeded && genericError && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Couldn&apos;t connect</Alert.Title>
                      <Alert.Description>{genericError}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                {/* Credentials — mounted for every step. `isRequired` only
                    on the credentials step because a required input inside
                    a `hidden` wrapper blocks form submit in Chrome ("not
                    focusable"). Missing values on picker re-submit are
                    caught server-side by `requiredString`. */}
                <Fieldset
                  hidden={!showCredentialsInBody}
                  className="flex flex-col gap-4"
                >
                  <Fieldset.Legend className="sr-only">
                    Sunsynk account
                  </Fieldset.Legend>

                  <TextInputField
                    name="email"
                    type="email"
                    label="Sunsynk email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    icon={<Envelope aria-hidden className="size-4 text-muted" />}
                    isRequired={showCredentialsInBody}
                    autoFocus={showCredentialsInBody}
                  />

                  <PasswordField
                    name="password"
                    label="Sunsynk password"
                    placeholder="Your Sunsynk password"
                    autoComplete="current-password"
                    isRequired={showCredentialsInBody}
                  />

                  {/* One reassurance block instead of three stacked
                      paragraphs: what happens to the password, and what
                      happens next. */}
                  <div className="flex items-start gap-2.5 rounded-2xl bg-surface-secondary px-3.5 py-3">
                    <ShieldCheck
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-success"
                    />
                    <p className="text-xs leading-5 text-muted">
                      Stored encrypted (AES-256-GCM) and used only to talk to
                      the Sunsynk API on your behalf. If your account has more
                      than one site or inverter, you&apos;ll pick which to link
                      next.
                    </p>
                  </div>
                </Fieldset>

                {showPlantInBody && "pickPlant" in result! && (
                  <PickerFieldset
                    legend="Sites on this account"
                    hint="Your Sunsynk account covers more than one home."
                    ariaLabel="Sunsynk site"
                    selected={selectedPlant}
                    onSelect={setSelectedPlant}
                    fieldName="plantId"
                  >
                    {result.pickPlant.map((plant) => (
                      <ListBox.Item
                        key={plant.id}
                        id={plant.id}
                        textValue={plant.label}
                      >
                        <House
                          aria-hidden
                          className="size-4 shrink-0 text-muted"
                        />
                        <Label>{plant.label}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </PickerFieldset>
                )}

                {showInverterInBody && "pickInverter" in result! && (
                  <PickerFieldset
                    legend="Inverters at this site"
                    hint="Telemetry is read from the one you pick."
                    ariaLabel="Sunsynk inverter"
                    selected={selectedInverter}
                    onSelect={setSelectedInverter}
                    fieldName="inverterSerial"
                  >
                    {result.pickInverter.map((inv) => (
                      <ListBox.Item
                        key={inv.serial}
                        id={inv.serial}
                        textValue={inv.label}
                      >
                        <Cpu
                          aria-hidden
                          className="size-4 shrink-0 text-muted"
                        />
                        <div className="flex flex-col">
                          <Label>{inv.label}</Label>
                          {/* Only when the label doesn't already carry the
                              serial — several Sunsynk accounts name the
                              inverter after it. */}
                          {!inv.label.includes(inv.serial) && (
                            <Description>Serial {inv.serial}</Description>
                          )}
                        </div>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </PickerFieldset>
                )}
              </Modal.Body>

              <Modal.Footer>
                {!succeeded && (
                  <>
                    <Button slot="close" variant="tertiary">
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      isDisabled={submitDisabled}
                    >
                      {isPending ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Connecting…
                        </>
                      ) : (
                        submitLabel
                      )}
                    </Button>
                  </>
                )}
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
