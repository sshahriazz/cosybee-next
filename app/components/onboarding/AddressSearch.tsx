"use client";

import type { Key, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ComboBox,
  Description,
  Input,
  Label,
  ListBox,
  Spinner,
} from "@heroui/react";

/**
 * Debounced typeahead against the AFD Postcode Evolution proxy. Same
 * shape as mobile's `AddressSearchField`: minimum 3 characters, 250 ms
 * debounce, session id grouping consecutive keystrokes into one billable
 * AFD lookup, keyboard nav on the suggestion list.
 *
 * Built on HeroUI's `ComboBox`. Passing `items` (server-provided) tells
 * react-aria to skip its default in-memory filter — the popover just
 * renders whatever the AFD proxy returned for the current query, and
 * the built-in listbox handles arrow-key / Enter / Escape navigation.
 * `menuTrigger="input"` reopens the popover as the user types so a
 * fresh result set is visible without a focus dance.
 *
 * The parent is told about a selection through `onPick(key, label)`.
 * `key` is opaque — never parsed — and is what the next onboarding step
 * uses to resolve the full address.
 */

interface Suggestion {
  key: string;
  label: string;
  postcode: string;
  countryIso: string;
}

interface Props {
  onPick: (key: string, label: string) => void;
  autoFocus?: boolean;
  /** Visible field label. Falls back to an `aria-label` when omitted, so
   *  the combobox stays accessible either way. */
  label?: ReactNode;
  /** Helper text under the field. */
  description?: ReactNode;
}

const DEBOUNCE_MS = 250;
const MIN_CHARS = 3;

export function AddressSearch({
  onPick,
  autoFocus,
  label,
  description,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Groups keystrokes into one billable AFD lookup; rotated after every
  // pick so a follow-up search starts a new session.
  const sessionIdRef = useRef<string>(newSessionId());

  const doSearch = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/onboarding/address/search?q=${encodeURIComponent(query)}&sessionId=${sessionIdRef.current}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      if (!res.ok) {
        setError("Address search unavailable. Try again in a moment.");
        setSuggestions([]);
        return;
      }
      const body = (await res.json()) as { suggestions?: Suggestion[] };
      setSuggestions(body.suggestions ?? []);
    } catch {
      setError("Address search unavailable. Try again in a moment.");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce. Clear stale results as soon as the query dips below the
  // threshold so the popover empty-state message matches the input.
  useEffect(() => {
    if (inputValue.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setError(null);
      setLoading(false);
      return;
    }
    const handle = setTimeout(() => {
      void doSearch(inputValue.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [inputValue, doSearch]);

  const belowMin = inputValue.trim().length < MIN_CHARS;

  function handleSelectionChange(key: Key | null) {
    if (key === null) return;
    const picked = suggestions.find((s) => s.key === String(key));
    if (!picked) return;
    onPick(picked.key, picked.label);
    // Rotate session so a re-search after coming back doesn't accidentally
    // combine with the previous billable lookup.
    sessionIdRef.current = newSessionId();
  }

  return (
    <ComboBox
      fullWidth
      aria-label={label ? undefined : "Address or postcode"}
      items={suggestions}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSelectionChange={handleSelectionChange}
      menuTrigger="input"
      allowsEmptyCollection
    >
      {label && <Label>{label}</Label>}
      <ComboBox.InputGroup>
        <Input
          autoFocus={autoFocus}
          variant="secondary"
          fullWidth
          placeholder="Start typing a postcode, e.g. SW1A 1AA"
        />
      </ComboBox.InputGroup>
      {description && <Description>{description}</Description>}
      <ComboBox.Popover>
        <ListBox
          items={suggestions}
          renderEmptyState={() => (
            <EmptyState
              belowMin={belowMin}
              loading={loading}
              error={error}
            />
          )}
        >
          {(s: Suggestion) => (
            <ListBox.Item
              id={s.key}
              textValue={`${s.label} ${s.postcode}`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">
                  {s.label}
                </span>
                <span className="truncate text-xs text-muted">
                  {s.postcode}
                </span>
              </span>
            </ListBox.Item>
          )}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}

/**
 * Popover placeholder while there are no items to render. Covers all four
 * transient states of the search — below-min, in-flight, error, and
 * empty result — so the popover always has a meaningful line rather
 * than collapsing to a blank box.
 */
function EmptyState({
  belowMin,
  loading,
  error,
}: {
  belowMin: boolean;
  loading: boolean;
  error: string | null;
}) {
  if (belowMin) {
    return (
      <p className="px-3 py-2 text-xs text-muted">
        Type at least {MIN_CHARS} characters to search.
      </p>
    );
  }
  if (loading) {
    return (
      <p className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
        <Spinner size="sm" /> Searching…
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="px-3 py-2 text-xs text-danger">
        {error}
      </p>
    );
  }
  return (
    <p className="px-3 py-2 text-xs text-muted">
      No matches. Check the spelling, or try a nearby postcode.
    </p>
  );
}

/**
 * `crypto.randomUUID` is available in every browser the app supports; the
 * `typeof` guard is only there so the file compiles under RSC / SSR where
 * the global would otherwise be evaluated at import time.
 */
function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
