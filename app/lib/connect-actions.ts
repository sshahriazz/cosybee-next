"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * `createProperty` is grouped here alongside the connect actions rather
 * than in its own file because it shares every helper (cookie forwarding,
 * required-string validation, ConnectResult shape) and because the three
 * actions are the *same onboarding funnel* — creating a home is step 1,
 * connecting SunSync + Octopus are step 2. Same funnel → same file.
 */

/**
 * Server Actions that back the SunSync / Octopus connect modals.
 *
 * Both endpoints on eb-auth (`POST /api/sunsynk/connect` and
 * `POST /api/octopus/connect`) require the same session cookie the rest of
 * the frontend forwards. Running the round-trip on the server keeps the
 * credentials off the client wire — the browser never sees them after the
 * initial form submit — and keeps the eb-auth API surface out of CORS
 * scope (the browser only ever talks to Next).
 *
 * On success both actions `revalidatePath("/dashboard")`, so the
 * page auto-flips from `ConnectionEmptyState` into the connected tier the
 * next time the user lands on it — no manual navigation needed.
 */

const API_URL = process.env.API_URL || "http://localhost:4000";

/** Discriminated result the client uses to decide "close modal" vs "show error". */
export type ConnectResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

/**
 * SunSync's connect flow has two extra outcomes: the account can carry
 * multiple sites (plants), and a single site can carry multiple inverters.
 * eb-auth surfaces these as 400s whose body carries the choices in
 * `details[]` — we lift them into a discriminated result so the modal
 * can render a picker instead of a generic error.
 *
 * The credentials are NOT threaded through the result; the modal keeps
 * them in the same visible <input> elements across the picker re-render,
 * so the second submit picks them up from the DOM directly. Zero
 * client-side credential state.
 */
export type SunSyncConnectResult =
  | ConnectResult
  | { ok: false; pickPlant: Array<{ id: string; label: string }> }
  | { ok: false; pickInverter: Array<{ serial: string; label: string }> };

/**
 * Build the `Cookie:` header from the incoming request. Same shape
 * server-session.ts uses; inlined here rather than exported from that
 * file because the auth choke point is a single-purpose helper and this
 * concern (proxying any authenticated call) is broader.
 */
async function cookieHeader(): Promise<string | null> {
  const store = await cookies();
  const header = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  return header.length > 0 ? header : null;
}

/**
 * Read a form field as a trimmed non-empty string, or return an error
 * result the modal can surface. Keeps the two actions tidy without a
 * form-validation library — the backend does its own strict validation
 * so we only need to catch the obvious client-side omissions.
 */
function requiredString(
  form: FormData,
  key: string,
  label: string,
): { value: string } | { error: string } {
  const raw = form.get(key);
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { error: `${label} is required.` };
  }
  return { value: raw.trim() };
}

/**
 * Property setup — step 1 of onboarding.
 *
 * eb-auth's SunSync / Octopus connect endpoints refuse to run until the
 * user has an *active property* (see the `activePropertyResolver`
 * middleware). This action creates one and pins it as active in a single
 * user gesture:
 *
 *   1. `POST /api/properties { label, address, postcode? }` — the main
 *      path. `postcode` is optional; the backend derives `regionId` from
 *      it when supplied.
 *   2. `POST /api/properties/:id/activate` — writes both the session-
 *      scoped Redis marker and the durable `User.defaultPropertyId`, so
 *      later requests without an `X-Property-Id` header still resolve to
 *      the same home.
 *
 * On success we revalidate `/dashboard` so the empty state advances
 * from the "set up your home" step to the provider CTAs the next paint.
 */
export async function createProperty(form: FormData): Promise<ConnectResult> {
  const label = requiredString(form, "label", "Home name");
  if ("error" in label) return { ok: false, error: label.error };
  const address = requiredString(form, "address", "Address");
  if ("error" in address) return { ok: false, error: address.error };

  const rawPostcode = form.get("postcode");
  const postcode =
    typeof rawPostcode === "string" && rawPostcode.trim().length > 0
      ? rawPostcode.trim().toUpperCase()
      : undefined;

  const cookie = await cookieHeader();
  if (cookie === null) {
    return { ok: false, error: "You need to sign in first." };
  }

  try {
    const createRes = await fetch(`${API_URL}/api/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        label: label.value,
        address: address.value,
        ...(postcode ? { postcode } : {}),
      }),
      cache: "no-store",
    });

    if (!createRes.ok) {
      const body = (await createRes.json().catch(() => null)) as
        | { message?: string; code?: string }
        | null;
      return {
        ok: false,
        error: body?.message ?? "Couldn't save your home details.",
        ...(body?.code ? { code: body.code } : {}),
      };
    }

    const created = (await createRes.json()) as { id: string };

    // Activate: pins this property as the resolved default for future
    // authenticated calls. Without this step, the connect endpoints would
    // still fall back to "first non-archived" — which happens to be the
    // one we just created — but relying on the fallback would mean the
    // FIRST subsequent request has to race the property-just-created
    // write. Explicit activation removes the race.
    const activateRes = await fetch(
      `${API_URL}/api/properties/${created.id}/activate`,
      {
        method: "POST",
        headers: { Cookie: cookie },
        cache: "no-store",
      },
    );
    if (!activateRes.ok) {
      const body = (await activateRes.json().catch(() => null)) as
        | { message?: string }
        | null;
      return {
        ok: false,
        error:
          body?.message ??
          "Your home was created but we couldn't mark it as active. Refresh and try again.",
      };
    }

    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the service. Try again in a moment.",
    };
  }
}

/**
 * SunSync — first pass. Uses the credentials-only shape; when the account
 * has multiple plants or inverters, eb-auth responds with a 400 whose
 * body identifies the case. A later revision of this action will call
 * `POST /api/sunsynk/plants` first, present a picker, and pass the chosen
 * ids back through in `plantId` / `inverterSerial`. Until then, single-
 * plant single-inverter accounts connect in one click and multi-plant
 * accounts get a message telling them what's next.
 */
export async function connectSunSync(form: FormData): Promise<SunSyncConnectResult> {
  const email = requiredString(form, "email", "Sunsynk email");
  if ("error" in email) return { ok: false, error: email.error };
  const password = requiredString(form, "password", "Sunsynk password");
  if ("error" in password) return { ok: false, error: password.error };

  // Optional picker fields. Present on the SECOND submit — after the user
  // has resolved a multi-site or multi-inverter response from the first.
  const rawPlantId = form.get("plantId");
  const plantId =
    typeof rawPlantId === "string" && rawPlantId.trim().length > 0
      ? rawPlantId.trim()
      : undefined;
  const rawInverterSerial = form.get("inverterSerial");
  const inverterSerial =
    typeof rawInverterSerial === "string" && rawInverterSerial.trim().length > 0
      ? rawInverterSerial.trim()
      : undefined;

  const cookie = await cookieHeader();
  if (cookie === null) {
    return { ok: false, error: "You need to sign in before connecting Sunsynk." };
  }

  try {
    const res = await fetch(`${API_URL}/api/sunsynk/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
        ...(plantId ? { plantId } : {}),
        ...(inverterSerial ? { inverterSerial } : {}),
      }),
      cache: "no-store",
    });

    if (res.ok) {
      // Flip the page's tier without a full navigation next paint.
      revalidatePath("/dashboard");
      return { ok: true };
    }

    // eb-auth returns the choice list in `details[]` when the account has
    // more than one site or the chosen site more than one inverter. We
    // detect these by the (stable, human-facing) message text and lift
    // them into their own result shapes so the modal can render pickers.
    const body = (await res.json().catch(() => null)) as
      | {
          message?: string;
          code?: string;
          details?: Array<{ field?: string; message?: string }>;
        }
      | null;
    const details = body?.details ?? [];

    // The eb-auth strings are the source of truth here: they're built once
    // in sunsynk.errors.ts and the checks match by substring so a minor
    // copy edit ("multiple" ↔ "several") doesn't break detection.
    const message = body?.message ?? "";
    if (
      details.length > 1 &&
      /multiple sites/i.test(message)
    ) {
      return {
        ok: false,
        pickPlant: details
          .filter((d): d is { field: string; message: string } =>
            typeof d.field === "string" && typeof d.message === "string",
          )
          .map((d) => ({ id: d.field, label: d.message })),
      };
    }
    if (
      details.length > 1 &&
      /(several|multiple) inverters/i.test(message)
    ) {
      return {
        ok: false,
        pickInverter: details
          .filter((d): d is { field: string; message: string } =>
            typeof d.field === "string" && typeof d.message === "string",
          )
          .map((d) => ({ serial: d.field, label: d.message })),
      };
    }

    return {
      ok: false,
      error: body?.message ?? "Sunsynk rejected those credentials.",
      ...(body?.code ? { code: body.code } : {}),
    };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the Sunsynk service. Try again in a moment.",
    };
  }
}

/**
 * Octopus — single-shot. Both fields come from the customer's Octopus
 * dashboard and the backend does the MPAN / tariff / region discovery
 * itself. `backfillComplete: false` in the response is expected — the
 * dashboard surfaces a "syncing your history" banner while eb-auth
 * back-fills the last ~13 months of consumption in the background.
 */
export async function connectOctopus(form: FormData): Promise<ConnectResult> {
  const accountNumber = requiredString(
    form,
    "accountNumber",
    "Octopus account number",
  );
  if ("error" in accountNumber) return { ok: false, error: accountNumber.error };
  const apiKey = requiredString(form, "apiKey", "Octopus API key");
  if ("error" in apiKey) return { ok: false, error: apiKey.error };

  const cookie = await cookieHeader();
  if (cookie === null) {
    return { ok: false, error: "You need to sign in before connecting Octopus." };
  }

  try {
    const res = await fetch(`${API_URL}/api/octopus/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        apiKey: apiKey.value,
        accountNumber: accountNumber.value,
      }),
      cache: "no-store",
    });

    if (res.ok) {
      revalidatePath("/dashboard");
      return { ok: true };
    }

    const body = (await res.json().catch(() => null)) as
      | { message?: string; code?: string }
      | null;
    return {
      ok: false,
      error:
        body?.message ??
        "Octopus rejected that API key or account number.",
      ...(body?.code ? { code: body.code } : {}),
    };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the Octopus service. Try again in a moment.",
    };
  }
}
