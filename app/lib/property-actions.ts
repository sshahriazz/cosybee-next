"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Server Actions for switching the currently active property.
 *
 * The mobile app's Dio interceptor sends `X-Property-Id: <active>` on every
 * eb-auth request (see `energiebeemobile/lib/app/di/network_providers.dart`).
 * The web reaches the same steady state by calling `POST /api/properties/
 * :id/activate`, which primes both the session-scoped Redis marker
 * (`ep:active:{sessionId}`) and the durable `User.defaultPropertyId`. After
 * that, every subsequent request from the session resolves to the picked
 * home even without the header — matching the mobile behaviour end-to-end.
 */

const API_URL = process.env["API_URL"] ?? "http://localhost:4000";

export type PropertyActionResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

async function cookieHeader(): Promise<string | null> {
  const store = await cookies();
  const header = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  return header.length > 0 ? header : null;
}

/**
 * Set `propertyId` as the active home for the current session. Safe to call
 * even when it is already active — the backend upserts the Redis marker.
 */
export async function activateProperty(propertyId: string): Promise<PropertyActionResult> {
  if (propertyId.trim().length === 0) return { ok: false, error: "Missing property id." };

  const cookie = await cookieHeader();
  if (cookie === null) return { ok: false, error: "You need to sign in first." };

  try {
    const res = await fetch(`${API_URL}/api/properties/${encodeURIComponent(propertyId)}/activate`, {
      method: "POST",
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as
        | { message?: string; code?: string }
        | null;
      return {
        ok: false,
        error: body?.message ?? "Couldn't switch home.",
        ...(body?.code ? { code: body.code } : {}),
      };
    }
    // Invalidate the dashboard so every server-rendered card re-fetches
    // against the newly active home.
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't reach the service. Try again in a moment." };
  }
}
