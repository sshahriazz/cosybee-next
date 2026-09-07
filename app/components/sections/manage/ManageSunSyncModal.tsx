"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import {
  Alert,
  Button,
  Chip,
  Description,
  Header,
  Label,
  ListBox,
  Modal,
  Separator,
  Spinner,
} from "@heroui/react";
import { ArrowsRotateLeft, LinkSlash, Sun } from "@gravity-ui/icons";
import {
  disconnectSunSync,
  listSunSyncPlants,
  switchSunSyncSelection,
  type LinkedPlant,
  type ProviderActionResult,
} from "@/app/lib/provider-actions";

/**
 * Post-connect management dialog for SunSync. Two actions live behind one
 * modal so the ProviderStatusBar row only needs a single "Manage" trigger:
 *
 *   • Disconnect — unlink the SunSync account (historical readings stay).
 *   • Switch inverter — repoint to a different plant/inverter on the SAME
 *     linked account. Destructive: the backend deletes the previous
 *     inverter's readings, so the warning sits above the list, where it
 *     is read BEFORE the tap that applies the change.
 *
 * Kept in `sections/manage/` — same rationale as `sections/connect/`: the
 * lifecycle actions cluster by domain, not by dashboard slot, and any card
 * that wants to expose them just imports the modal.
 *
 * ### Design notes
 *
 *   • The menu is a HeroUI `ListBox` with `selectionMode="none"` +
 *     `onAction` — the library's own action-menu pattern, with
 *     `variant="danger"` carrying the destructive tint. It replaced two
 *     hand-rolled `<button>` cards that re-implemented hover, focus and
 *     danger styling by hand and picked up none of the keyboard
 *     behaviour (arrow keys, typeahead) a listbox gives for free.
 *   • Tints come from HeroUI tokens. The header icon and the selected
 *     inverter row both reached for `var(--efh-solar)`, which is scoped
 *     to `.efh-scope` in globals.css — this dialog portals to
 *     `document.body`, outside that scope, so the header icon rendered
 *     on a blank square and the selected row got no highlight at all.
 *   • Status feedback is `Alert`, matching the connect dialogs.
 *   • The inverter picker is a sectioned `ListBox` — one plant per
 *     section, one tap to apply. It replaced a `RadioGroup` wrapped
 *     around an `Accordion`: every plant was collapsed, so reaching any
 *     inverter took two clicks and a third on a submit button, and a
 *     screen full of chevrons showed no inverters at all.
 *   • Applying on tap is the product decision here; the confirm step is
 *     gone. Plants with no inverters are dropped rather than rendered as
 *     un-openable rows, and the currently-linked inverter is disabled —
 *     switching to what you are already on is a no-op that would still
 *     bin your history.
 */

type View = "menu" | "disconnect" | "switch";

interface Props {
  children: ReactNode;
  /**
   * Rendered next to the modal title so the user is sure they're managing
   * the right home when the account has more than one linked property.
   */
  propertyLabel?: string | null;
}

export function ManageSunSyncModal({ children, propertyLabel }: Props) {
  const [view, setView] = useState<View>("menu");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Switch-inverter picker state
  const [plants, setPlants] = useState<LinkedPlant[] | null>(null);
  // "plantId::serial" of the row currently being applied, so that row can
  // show a spinner while every other row locks.
  const [switching, setSwitching] = useState<string | null>(null);

  // Plants with no inverters can't be switched to — the API still lists
  // them, but as rows they're dead weight.
  const plantsWithInverters =
    plants?.filter((p) => p.inverters.length > 0) ?? null;

  // The row you're already on. Disabled: re-picking it discards your
  // history for no gain.
  const currentKey =
    plants
      ?.flatMap((p) => p.inverters.map((i) => ({ p, i })))
      .find(({ i }) => i.isCurrent) ?? null;
  const currentId = currentKey
    ? `${currentKey.p.id}::${currentKey.i.serial}`
    : null;

  // Load the plant list when the user enters the switch view. Runs client-
  // side (Server Action call) so the dialog can open instantly on the menu
  // view without the network round-trip if the user only wants to disconnect.
  useEffect(() => {
    if (view !== "switch" || plants !== null) return;
    void (async () => {
      const result = await listSunSyncPlants();
      if (result.ok) {
        setPlants(result.plants);
      } else {
        setError(result.error);
      }
    })();
  }, [view, plants]);

  function reset() {
    setView("menu");
    setError(null);
    setSwitching(null);
    // Keep `plants` cached — reopening the modal doesn't need a refetch.
  }

  function handleDisconnect() {
    setError(null);
    startTransition(async () => {
      const result: ProviderActionResult = await disconnectSunSync();
      if (!result.ok) setError(result.error);
      // On success, revalidatePath in the action closes the connected tier
      // for real. Reset the dialog so if the user reopens for any reason
      // (fast connect + reopen), it starts fresh.
      else reset();
    });
  }

  /**
   * Applied straight from the tap — there is no confirm step, so the
   * warning above the list is the last thing read before this fires.
   */
  function handleSwitch(id: string) {
    setError(null);
    const [plantId, inverterSerial] = id.split("::");
    if (!plantId || !inverterSerial) {
      setError("Invalid selection.");
      return;
    }
    setSwitching(id);
    startTransition(async () => {
      const result = await switchSunSyncSelection({
        plantId,
        inverterSerial,
        confirmDiscardHistory: true,
      });
      setSwitching(null);
      if (!result.ok) setError(result.error);
      else reset();
    });
  }

  return (
    <Modal>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Backdrop>
        {/* The switch view holds an accordion of every plant on the
            account, so it earns the wider dialog; the other two views are
            a short list and a yes/no question. */}
        <Modal.Container
          size={view === "switch" ? "lg" : "md"}
          placement="center"
          scroll="inside"
        >
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="flex-row items-start gap-3 pe-10">
              <Modal.Icon className="bg-warning-soft text-warning-soft-foreground">
                <Sun aria-hidden className="size-5" />
              </Modal.Icon>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Modal.Heading>Manage Sunsynk</Modal.Heading>
                  {propertyLabel && (
                    <Chip color="default" variant="soft" size="sm">
                      {propertyLabel}
                    </Chip>
                  )}
                </div>
                <p className="mt-1 text-sm leading-5 text-muted">
                  {view === "menu" && "Choose what to change."}
                  {view === "disconnect" &&
                    "The dashboard stops receiving live power flow."}
                  {view === "switch" && "Pick the inverter to read from."}
                </p>
              </div>
            </Modal.Header>

            <Modal.Body>
              {error && (
                <Alert status="danger" className="mb-4">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              {view === "menu" && (
                <ListBox
                  aria-label="Sunsynk actions"
                  selectionMode="none"
                  onAction={(key) => setView(key as View)}
                  className="rounded-2xl border border-border bg-surface shadow-xs"
                >
                  <ListBox.Item id="switch" textValue="Switch inverter">
                    <ArrowsRotateLeft
                      aria-hidden
                      className="size-4 shrink-0 text-muted"
                    />
                    <div className="flex flex-col">
                      <Label>Switch inverter</Label>
                      <Description>
                        Pick a different plant or inverter on this account.
                      </Description>
                    </div>
                  </ListBox.Item>
                  <Separator />
                  <ListBox.Item
                    id="disconnect"
                    textValue="Disconnect Sunsynk"
                    variant="danger"
                  >
                    <LinkSlash
                      aria-hidden
                      className="size-4 shrink-0 text-danger"
                    />
                    <div className="flex flex-col">
                      <Label>Disconnect Sunsynk</Label>
                      <Description>
                        Stop live sync. Historical readings kept.
                      </Description>
                    </div>
                  </ListBox.Item>
                </ListBox>
              )}

              {/* No nested danger panel — the dialog, its heading and the
                  red confirm button already carry the warning. */}
              {view === "disconnect" && (
                <p className="text-sm leading-6 text-muted">
                  Your historical readings stay in your account, and
                  reconnecting later restores live sync.
                </p>
              )}

              {view === "switch" && (
                <div className="flex flex-col gap-4">
                  {/* Above the list, because a tap applies immediately —
                      but one muted line, not a boxed Alert. Three lines of
                      amber panel pushed the actual list below the fold. */}
                  <p className="text-xs leading-5 text-muted">
                    Applies right away, and clears stored history for the
                    inverter you&apos;re on now.
                  </p>

                  {plantsWithInverters === null && (
                    <div
                      role="status"
                      className="flex items-center gap-3 rounded-2xl bg-surface-secondary px-4 py-6"
                    >
                      <Spinner size="sm" />
                      <p className="text-sm text-muted">
                        Loading your Sunsynk plants…
                      </p>
                    </div>
                  )}

                  {plantsWithInverters !== null &&
                    plantsWithInverters.length === 0 && (
                      <p className="rounded-2xl bg-surface-secondary px-4 py-6 text-center text-sm text-muted">
                        No other inverters on this Sunsynk account.
                      </p>
                    )}

                  {plantsWithInverters !== null &&
                    plantsWithInverters.length > 0 && (
                      // Bounded height + overflow because HeroUI Modal's
                      // `scroll="inside"` sets overflow on Modal.Body but
                      // never gives it a height, so a long account pushed
                      // the footer off-screen with no scrollbar.
                      <ListBox
                        aria-label="Inverter"
                        selectionMode="none"
                        disabledKeys={
                          pending
                            ? plantsWithInverters.flatMap((p) =>
                                p.inverters.map((i) => `${p.id}::${i.serial}`),
                              )
                            : currentId
                              ? [currentId]
                              : []
                        }
                        onAction={(key) => handleSwitch(String(key))}
                        className="max-h-[min(55vh,26rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-2"
                      >
                        {plantsWithInverters.map((plant, plantIdx) => (
                          <ListBox.Section key={plant.id}>
                            {/* A rule above every group but the first —
                                react-aria's collection builder won't walk a
                                Fragment, so a real <Separator /> between
                                sections can't be produced from a .map(). */}
                            <Header
                              className={`text-[11px] font-semibold tracking-wider uppercase ${
                                plantIdx > 0
                                  ? "mt-2 border-t border-separator pt-3.5"
                                  : ""
                              }`}
                            >
                              {plant.label}
                            </Header>
                            {plant.inverters.map((inv) => {
                              const id = `${plant.id}::${inv.serial}`;
                              const { serial, status, isOnline } =
                                parseInverterLabel(inv.label);
                              return (
                                <ListBox.Item
                                  key={id}
                                  id={id}
                                  textValue={`${plant.label} ${serial}`}
                                >
                                  {/* The dot already says online/offline, so
                                      the word only appears when it's the
                                      exceptional one. Every row was two
                                      lines tall to print "online". */}
                                  <span
                                    aria-hidden
                                    className={`size-2 shrink-0 rounded-full ${
                                      isOnline ? "bg-success" : "bg-muted/50"
                                    }`}
                                  />
                                  <Label className="truncate font-mono text-[13px]">
                                    {serial}
                                  </Label>
                                  {switching === id ? (
                                    <Spinner size="sm" className="ms-auto" />
                                  ) : inv.isCurrent ? (
                                    <Chip
                                      color="success"
                                      variant="soft"
                                      size="sm"
                                      className="ms-auto shrink-0"
                                    >
                                      Linked
                                    </Chip>
                                  ) : !isOnline && status ? (
                                    <span className="ms-auto shrink-0 text-xs text-muted">
                                      {status}
                                    </span>
                                  ) : null}
                                </ListBox.Item>
                              );
                            })}
                          </ListBox.Section>
                        ))}
                      </ListBox>
                    )}
                </div>
              )}

            </Modal.Body>

            <Modal.Footer>
              {view === "menu" && (
                <Button slot="close" variant="tertiary">
                  Close
                </Button>
              )}
              {view !== "menu" && (
                <Button variant="tertiary" onPress={reset} isDisabled={pending}>
                  Back
                </Button>
              )}
              {view === "disconnect" && (
                <Button
                  variant="danger"
                  onPress={handleDisconnect}
                  isDisabled={pending}
                >
                  {pending ? "Disconnecting…" : "Disconnect"}
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/**
 * Splits the backend's `<serial> (online|offline)` label into its parts so
 * the row can style the status as a small coloured dot next to the serial
 * instead of raw text-in-parens. Anything that doesn't match the pattern
 * falls through unchanged — the row still displays the raw label.
 */
function parseInverterLabel(label: string): {
  serial: string;
  status: string | null;
  isOnline: boolean;
} {
  const match = /^(.+?)\s*\((online|offline)\)\s*$/i.exec(label);
  if (!match) return { serial: label, status: null, isOnline: false };
  const status = match[2]!.toLowerCase();
  return { serial: match[1]!, status, isOnline: status === "online" };
}


