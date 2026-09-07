"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Milliseconds of stillness before the work is sent, and the minimum gap
 * between two saves. Long enough that ordinary typing produces one request per
 * sentence rather than per word.
 */
const IDLE_MS = 4000;

/**
 * Longest anyone types without a save landing. Without this, someone writing
 * steadily for ten minutes never pauses long enough to trigger the idle timer
 * and never gets saved at all.
 */
const MAX_WAIT_MS = 30_000;

export type AutosaveState =
  | { status: "idle" }
  | { status: "dirty" }
  | { status: "saving" }
  // No `staged` here on purpose: whether unpublished work is outstanding is a
  // fact about the POST, not about the last request, and a second copy of it
  // in here is what let the message and the Discard button drift apart.
  | { status: "saved"; at: number }
  | { status: "error"; message: string };

/**
 * Autosave a value: debounce it, keep one request in flight, and never lose
 * the last edit.
 *
 * On "every new line" — the obvious trigger, and the wrong one. It fires a
 * request per Enter key, and since the save path is a round trip through two
 * services it queues work faster than it completes. Stillness is the better
 * signal: `IDLE_MS` after the last keystroke, with `MAX_WAIT_MS` as a ceiling
 * so continuous typing still gets saved. The felt behaviour is the same and
 * the traffic is a fraction of it.
 *
 * Three things this has to get right, all of which are about not losing work:
 *
 *  - **One request at a time.** Overlapping saves can land out of order, so a
 *    stale body would win. Edits made mid-flight set `pendingRef` and are sent
 *    when the current save returns.
 *  - **Compare, don't guess.** What was actually sent is remembered, so a save
 *    is skipped when nothing changed — a click into the editor and out again
 *    shouldn't write.
 *  - **Save on the way out.** Leaving the tab or the page cancels the timer,
 *    so `visibilitychange` and `pagehide` run the save immediately instead.
 */
export function useAutosave<T>({
  value,
  enabled,
  save,
  serialize = (v: T) => JSON.stringify(v),
}: {
  /** The work to keep. Any value; only its serialization is compared. */
  value: T;
  /** False until there is somewhere to save to (e.g. the post has no id yet). */
  enabled: boolean;
  /**
   * Persist the value. `previous` is what the last successful save sent — or
   * undefined the first time — so a caller can send only what actually
   * changed instead of the whole document every few seconds.
   */
  save: (
    value: T,
    previous: T | undefined,
  ) => Promise<{ ok: true; staged: boolean } | { ok: false; error: string }>;
  serialize?: (value: T) => string;
}): AutosaveState {
  const [state, setState] = useState<AutosaveState>({ status: "idle" });

  // Refs, not state: these are read inside timers and event handlers that must
  // not be re-created (and must not re-run effects) on every keystroke.
  const valueRef = useRef(value);
  const savedRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstDirtyAtRef = useRef<number | null>(null);
  const saveRef = useRef(save);
  const serializeRef = useRef(serialize);
  /** The value the last successful save sent, for field-level diffing. */
  const lastSentRef = useRef<T | undefined>(undefined);
  /** Latest `run`, so it can reschedule itself without naming itself. */
  const runRef = useRef<() => void>(() => {});

  // Refreshed in an effect rather than during render: the React Compiler
  // forbids writing a ref while rendering, and this runs after every commit,
  // so anything a timer or event handler reads later is current.
  useEffect(() => {
    valueRef.current = value;
    saveRef.current = save;
    serializeRef.current = serialize;
  });

  const run = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!enabled) return;
    if (inFlightRef.current) return;

    const snapshot = serializeRef.current(valueRef.current);
    if (snapshot === savedRef.current) return;

    inFlightRef.current = true;
    firstDirtyAtRef.current = null;
    setState({ status: "saving" });
    try {
      const previous = lastSentRef.current;
      const current = valueRef.current;
      const result = await saveRef.current(current, previous);
      if (result.ok) {
        // Record what was SENT, not what is on screen now — anything typed
        // during the request differs from this and schedules another pass.
        savedRef.current = snapshot;
        lastSentRef.current = current;
        setState({ status: "saved", at: Date.now() });
      } else {
        setState({ status: "error", message: result.error });
      }
    } catch (e) {
      setState({ status: "error", message: (e as Error).message });
    } finally {
      inFlightRef.current = false;
      // ONE save per run, then back to waiting.
      //
      // This used to loop while the value kept moving, which meant that once a
      // save started, someone still typing got a fresh request the instant the
      // last one returned — back-to-back traffic for as long as they wrote.
      // Anything typed during the request is instead picked up on the ordinary
      // idle delay, so the gap between saves is never shorter than IDLE_MS.
      //
      // Scheduled through a ref because a callback that names itself is what
      // the React Compiler refuses to memoize — the reason for the loop.
      if (serializeRef.current(valueRef.current) !== savedRef.current) {
        timerRef.current = setTimeout(() => runRef.current(), IDLE_MS);
      }
    }
  }, [enabled]);

  // Kept below `run` so it can point at it: the reschedule inside `run` reads
  // this ref rather than the binding, which is what keeps the callback free of
  // a reference to itself.
  useEffect(() => {
    runRef.current = () => void run();
  }, [run]);

  /**
   * Whether there was somewhere to save to when the editor opened.
   *
   * The distinction matters. For a post that already existed, what is on
   * screen came from the server and adopting it as the baseline stops the
   * mere act of opening the editor from writing. For a post created
   * mid-session, everything typed BEFORE it existed is genuinely unsaved —
   * adopting there would silently drop the title and body someone wrote
   * while choosing a slug.
   */
  const existedOnMountRef = useRef(enabled);

  useEffect(() => {
    if (enabled && existedOnMountRef.current && savedRef.current === null) {
      savedRef.current = serializeRef.current(valueRef.current);
      lastSentRef.current = valueRef.current;
    }
  }, [enabled]);

  const serialized = serialize(value);
  useEffect(() => {
    if (!enabled) return;
    if (serialized === savedRef.current) return;

    // Returning `prev` unchanged is load-bearing, not a micro-optimisation:
    // handing back a fresh `{status:"dirty"}` object re-rendered the component
    // on every pass, and this effect re-ran with it — clearing the pending
    // timer and setting a new one each time, so the save never fired.
    setState((prev) =>
      prev.status === "saving" || prev.status === "dirty"
        ? prev
        : { status: "dirty" },
    );

    const now = Date.now();
    firstDirtyAtRef.current ??= now;
    // Never let the ceiling be pushed back by continued typing: the delay is
    // whatever is left of it, or the idle window, whichever comes first.
    const remaining = firstDirtyAtRef.current + MAX_WAIT_MS - now;
    const delay = Math.max(0, Math.min(IDLE_MS, remaining));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runRef.current(), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // Deliberately NOT keyed on `run`. What this effect schedules is "a save,
    // eventually" — a change in that function's identity is not a new reason
    // to restart the countdown, and keying on it meant any re-render could
    // reset the timer indefinitely. The ref always points at the current one.
  }, [serialized, enabled]);

  // Leaving the page kills the timer, so save now instead. `visibilitychange`
  // rather than `beforeunload`: it is the one that fires reliably when a tab
  // is backgrounded or closed on mobile.
  useEffect(() => {
    if (!enabled) return;
    // Through the ref for the same reason as above — re-subscribing these on
    // every render is pure churn.
    const flushNow = () => runRef.current();
    const onHidden = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flushNow);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flushNow);
    };
  }, [enabled]);

  return state;
}
