"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Server Actions + server helpers backing the onboarding funnel.
 *
 * Sits alongside `connect-actions.ts` (initial provider connect) and
 * `provider-actions.ts` (post-connect management). Split by phase: this
 * file owns the pre-dashboard funnel — address retrieval, EPC lookup,
 * property creation.
 *
 * Every call proxies an eb-auth endpoint the mobile app already uses; no
 * new backend surface is introduced. Endpoints and shapes are documented
 * in `eb-auth/src/modules/{address,epc,properties}`.
 */

const API_URL = process.env["API_URL"] ?? "http://localhost:4000";

// ── Cookie helper ────────────────────────────────────────────────────────

async function cookieHeader(): Promise<string | null> {
  const store = await cookies();
  const header = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  return header.length > 0 ? header : null;
}

// ── Types ────────────────────────────────────────────────────────────────

export interface ResolvedAddress {
  key: string;
  uprn: string;
  udprn: string;
  /**
   * Building name / number line, when AFD holds it separately from the
   * street — "1 Gorple Cottages", "Flat 3", "The Old Vicarage". Empty for
   * plain numbered addresses, where the number is part of `street`
   * instead. Always render it ahead of `street`: dropping it collapses
   * every home on a shared street to the same line.
   */
  property: string;
  /** Business / care-of name on the address. Usually empty for homes. */
  organisation: string;
  /** May already include the house number for UK numbered addresses. */
  street: string;
  locality: string;
  town: string;
  county: string;
  postcode: string;
  country: string;
  countryIso: string;
  latitude: number | null;
  longitude: number | null;
}

export interface EpcCertificateRow {
  certificateNumber: string;
  address?: string;
  postcode?: string;
  currentEnergyRating?: string;
  propertyType?: string;
  builtForm?: string;
  totalFloorArea?: string;
  lodgementDate?: string;
}

export type PropertyCreateResult =
  | { ok: true; propertyId: string }
  | { ok: false; error: string; code?: string };

// ── Address retrieve (server-side, for SSR) ──────────────────────────────

/**
 * Resolve a full address from an opaque AFD `key` (returned by search).
 * Server-side so the SSR pass of `/onboarding/building-profile` has the
 * postcode ready to hand to the EPC lookup without a second round-trip
 * from the client.
 */
export async function retrieveAddress(key: string): Promise<ResolvedAddress | null> {
  if (key.trim().length === 0) return null;
  const cookie = await cookieHeader();
  if (cookie === null) return null;
  const upstream = new URL(`${API_URL}/api/address/retrieve`);
  upstream.searchParams.set("key", key);
  upstream.searchParams.set("country", "GBR");
  // A synthetic per-render session id is fine here — the SSR pass is a
  // single lookup, not a debounced typing burst.
  upstream.searchParams.set("sessionId", `ssr-${Date.now()}`);

  try {
    const res = await fetch(upstream.toString(), {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { address: ResolvedAddress | null };
    return body.address;
  } catch {
    return null;
  }
}

// ── EPC search (server-side) ─────────────────────────────────────────────

/**
 * List EPC certificates for a postcode. Returns `[]` when the address has
 * no EPC on the register — a normal outcome for new-builds and some
 * non-domestic addresses. The building-profile page interprets `[]` as the
 * signal to fall back to the no-EPC create path.
 */
export async function searchEpcByPostcode(postcode: string): Promise<EpcCertificateRow[]> {
  if (postcode.trim().length === 0) return [];
  const cookie = await cookieHeader();
  if (cookie === null) return [];

  const upstream = new URL(`${API_URL}/api/epc/search`);
  upstream.searchParams.set("postcode", postcode);

  try {
    const res = await fetch(upstream.toString(), {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { rows?: EpcCertificateRow[] };
    return body.rows ?? [];
  } catch {
    return [];
  }
}

/**
 * List EPC certificates for a specific UPRN. Mirrors mobile's
 * `EpcApiService.searchByUprn` (see energiebeemobile
 * `features/epc/data/services/epc_api_service.dart`).
 *
 * Preferred over the postcode search whenever a UPRN is available: a UPRN
 * identifies exactly one property, so matching on it removes the risk of
 * showing a neighbour's certificate and lets the funnel skip the "pick
 * yours from 9" step entirely.
 *
 * An empty result is a definitive "this property has no EPC" (not "we
 * couldn't match the address"), so the caller can confidently jump to
 * the no-EPC branch. When the exact-match returns nothing, the caller
 * still has the postcode search as a fallback.
 */
export async function searchEpcByUprn(uprn: string): Promise<EpcCertificateRow[]> {
  if (uprn.trim().length === 0) return [];
  const cookie = await cookieHeader();
  if (cookie === null) return [];

  const upstream = new URL(`${API_URL}/api/epc/search`);
  upstream.searchParams.set("uprn", uprn.trim());

  try {
    const res = await fetch(upstream.toString(), {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { rows?: EpcCertificateRow[] };
    return body.rows ?? [];
  } catch {
    return [];
  }
}

// ── Property create ──────────────────────────────────────────────────────

/**
 * Read a `{message, code, details}` error envelope defensively. Returns the
 * fallback copy when the backend body is missing or malformed.
 *
 * `details` carries one `{field, message}` per rejected field. Reading only
 * `message` turns every schema rejection into the same opaque "Request
 * validation failed." — which is what a missing `constructionEra` looked
 * like from the browser, with nothing on screen to say which field was at
 * fault. Fold the field errors in so a validation failure names itself.
 */
async function readError(res: Response, fallback: string): Promise<PropertyCreateResult> {
  const body = (await res.json().catch(() => null)) as
    | { message?: string; code?: string; details?: { field?: string; message?: string }[] }
    | null;
  const fields = (body?.details ?? [])
    .map((d) => {
      const field = d.field?.trim() ?? "";
      const message = d.message?.trim() ?? "";
      if (message.length === 0) return field;
      return field.length > 0 ? `${field}: ${message}` : message;
    })
    .filter((line) => line.length > 0);
  const message = body?.message ?? fallback;
  return {
    ok: false,
    error: fields.length > 0 ? `${message} (${fields.join("; ")})` : message,
    ...(body?.code ? { code: body.code } : {}),
  };
}

/**
 * Create a property from a chosen EPC certificate. Backend derives the
 * full address, postcode, uprn, and coordinates from the EPC record and
 * marks the property active — a single POST does the job of what mobile's
 * property_location + building_profile screens are wired to on device.
 */
export async function createPropertyFromEpc(input: {
  certificateNumber: string;
  label?: string;
}): Promise<PropertyCreateResult> {
  if (input.certificateNumber.trim().length === 0) {
    return { ok: false, error: "Missing EPC certificate number." };
  }
  const cookie = await cookieHeader();
  if (cookie === null) return { ok: false, error: "You need to sign in first." };

  try {
    const res = await fetch(`${API_URL}/api/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        certificateNumber: input.certificateNumber.trim(),
        ...(input.label && input.label.trim().length > 0
          ? { label: input.label.trim() }
          : {}),
      }),
      cache: "no-store",
    });
    if (!res.ok) return readError(res, "Couldn't create your home from that EPC.");
    const body = (await res.json()) as { id?: string };
    if (!body.id) return { ok: false, error: "Backend returned no property id." };
    // The dashboard reads properties on next paint — invalidate now so the
    // subsequent redirect from onboarding lands on live state.
    revalidatePath("/dashboard");
    return { ok: true, propertyId: body.id };
  } catch {
    return { ok: false, error: "Couldn't reach the service. Try again in a moment." };
  }
}

/**
 * The `latitude`/`longitude` pair to merge into a create payload, or nothing.
 *
 * Without a geocode a new home has no location at all, and the solar and
 * weather forecasts have nothing to forecast against — so this is worth
 * sending whenever AFD gives it to us.
 *
 * `0, 0` is deliberately NOT sent. It is both the "no geocode" sentinel and
 * a real point in the Gulf of Guinea; the backend rejects it outright, so
 * forwarding it would fail the entire create rather than merely omitting a
 * location we never had. Mobile learned this the hard way — see
 * `EpcWizardState.toApiPayload`.
 */
function geocode(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): { latitude: number; longitude: number } | Record<string, never> {
  if (typeof latitude !== "number" || typeof longitude !== "number") return {};
  if (latitude === 0 && longitude === 0) return {};
  return { latitude, longitude };
}

/**
 * Create a property without an EPC — used when the address search returned
 * no matching EPC on the register (new-builds, non-domestic, etc.). Mobile
 * takes the equivalent path via the same endpoint.
 */
export async function createPropertyWithoutEpc(input: {
  label: string;
  address: string;
  postcode: string;
  /**
   * When the home was built. Required by the backend alongside `address` —
   * it is what the estimator keys off to fill in every question onboarding
   * doesn't ask (see `CONSTRUCTION_ERAS`).
   */
  constructionEra: string;
  /** UK property identifier from the address lookup. Empty for non-UK. */
  uprn?: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<PropertyCreateResult> {
  const label = input.label.trim();
  const address = input.address.trim();
  const postcode = input.postcode.trim().toUpperCase();
  const constructionEra = input.constructionEra.trim();
  const uprn = input.uprn?.trim() ?? "";
  if (label.length === 0) return { ok: false, error: "A home name is required." };
  if (address.length === 0) return { ok: false, error: "Address is required." };
  if (postcode.length === 0) return { ok: false, error: "Postcode is required." };
  if (constructionEra.length === 0) {
    return { ok: false, error: "Tell us when your home was built." };
  }

  const cookie = await cookieHeader();
  if (cookie === null) return { ok: false, error: "You need to sign in first." };

  try {
    const res = await fetch(`${API_URL}/api/properties/no-epc`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        label,
        address,
        postcode,
        constructionEra,
        ...(uprn.length > 0 ? { uprn } : {}),
        ...geocode(input.latitude, input.longitude),
      }),
      cache: "no-store",
    });
    if (!res.ok) return readError(res, "Couldn't save your home details.");
    const body = (await res.json()) as { id?: string };
    if (!body.id) return { ok: false, error: "Backend returned no property id." };
    revalidatePath("/dashboard");
    return { ok: true, propertyId: body.id };
  } catch {
    return { ok: false, error: "Couldn't reach the service. Try again in a moment." };
  }
}
