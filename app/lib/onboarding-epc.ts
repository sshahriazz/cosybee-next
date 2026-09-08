import type { EpcCertificateRow, ResolvedAddress } from "./onboarding-actions";

/**
 * Server-safe EPC resolution — decides whether the picked address maps to a
 * single, obvious EPC (and therefore should skip the picker screen) or
 * whether the user genuinely needs to choose.
 *
 * Mirrors the mobile app's flow in
 * `energiebeemobile/lib/features/phase1/presentation/view/property_location_screen.dart`:
 *
 *   • UPRN present → certificates all belong to this exact property, so the
 *     newest one (by lodgement date) is the right pick — every prior row is a
 *     stale re-inspection of the same building.
 *   • No UPRN, only postcode → try `bestMatchByStreet` (leading-house-number
 *     heuristic). If it finds exactly one certificate for that unit, use it;
 *     otherwise defer to the user.
 *
 * Kept in its own module (no React, no browser globals) so the server page
 * can call it in the same render pass as the AFD/EPC fetches, and the
 * client picker can still call the same helpers for local best-match hints.
 */

export type EpcResolution =
  | { kind: "auto"; certificateNumber: string }
  | { kind: "pick" }
  | { kind: "none" };

export function resolveEpc(
  address: ResolvedAddress,
  certs: EpcCertificateRow[],
): EpcResolution {
  if (certs.length === 0) return { kind: "none" };

  const hasUprn = address.uprn.trim().length > 0;
  if (hasUprn) {
    const newest = mostRecentCertificate(certs);
    return newest
      ? { kind: "auto", certificateNumber: newest.certificateNumber }
      : { kind: "pick" };
  }

  // AFD keeps the building line separate from the street — "1 Gorple
  // Cottages" lands in `property` while `street` is just "Wallhurst
  // Close". The leading-house-number heuristic below needs whichever of
  // the two actually carries the unit, so prefer `property` and fall
  // back to `street` for plain numbered addresses ("1 Hope Street"),
  // where AFD leaves `property` empty.
  const unitLine =
    address.property.trim().length > 0 ? address.property : address.street;
  const match = bestMatchByStreet(certs, unitLine);
  return match
    ? { kind: "auto", certificateNumber: match.certificateNumber }
    : { kind: "pick" };
}

/**
 * Newest certificate for the same property. One property accumulates a fresh
 * EPC per inspection (they're valid ten years and get re-issued), and only
 * the latest reflects the current state of the building; picking an older
 * one shows a stale rating. Lodgement dates are ISO-8601 so they sort
 * lexicographically — no `Date` parsing, so a malformed value degrades to
 * ordering rather than throwing. Rows with no date sort last.
 */
export function mostRecentCertificate(
  certs: EpcCertificateRow[],
): EpcCertificateRow | null {
  if (certs.length === 0) return null;
  return [...certs].sort((a, b) => {
    const aDate = a.lodgementDate?.trim() ?? "";
    const bDate = b.lodgementDate?.trim() ?? "";
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return bDate.localeCompare(aDate);
  })[0]!;
}

/**
 * Postcode-fallback best-match: pick the single certificate whose address
 * starts with the same unit / house number the user typed. Mirrors mobile's
 * `_bestMatchCertificate`:
 *
 *   1. Extract the leading number from the address line — AFD's building
 *      line when it has one, else the street ("1 Hope Street" → "1",
 *      "Flat 12 Concert Square" → "12", "1a Hope Street" → "1a").
 *   2. Filter EPCs whose own address starts with that unit (also matching
 *      `flat N …` / `apartment N …` / `unit N …` prefixes).
 *   3. Exactly one match → return it. Zero or many → null, so the client
 *      shows the full list rather than gambling a wrong auto-pick (worse
 *      than an extra tap).
 *
 * Multiple matches for the same unit are usually re-inspections of the same
 * property — take the newest by lodgement date, same as the UPRN path.
 */
export function bestMatchByStreet(
  certs: EpcCertificateRow[],
  street: string,
): EpcCertificateRow | null {
  if (certs.length === 0) return null;
  if (certs.length === 1) return certs[0]!;

  const inputLower = street.trim().toLowerCase();

  let unit: string | null = null;
  const leading = /^(\d+[a-z]?)\b/i.exec(inputLower);
  if (leading) unit = leading[1]!;
  if (!unit) {
    const flat = /^(?:flat|apartment|unit)\s*(\d+[a-z]?)\b/i.exec(inputLower);
    if (flat) unit = flat[1]!;
  }
  if (!unit) return null;

  const unitEsc = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matchers: RegExp[] = [
    new RegExp(`^${unitEsc}\\b`, "i"),
    new RegExp(`^flat\\s*${unitEsc}\\b`, "i"),
    new RegExp(`^apartment\\s*${unitEsc}\\b`, "i"),
    new RegExp(`^unit\\s*${unitEsc}\\b`, "i"),
  ];

  const matches = certs.filter((cert) => {
    const certAddr = (cert.address ?? "").trim().toLowerCase();
    return matchers.some((re) => re.test(certAddr));
  });

  if (matches.length === 0) return null;
  return mostRecentCertificate(matches);
}
