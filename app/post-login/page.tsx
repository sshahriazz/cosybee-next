import { redirect } from "next/navigation";
import { Spinner } from "@heroui/react";
import { getServerSession } from "@/app/lib/server-session";
import { listProperties } from "@/app/lib/property-state";

/**
 * Post-login landing.
 *
 * One decision, one round-trip, then a redirect:
 *   • no session yet          → /login (the auth flow will bounce back
 *                                once the cookie is set)
 *   • banned                  → /banned
 *   • admin                   → /admin
 *   • signed-in, no property  → /onboarding/address (funnel start)
 *   • signed-in, has property → /dashboard (dashboard)
 *
 * The onboarding gate is DERIVED from "does the user own ≥ 1 non-archived
 * property?" — no durable `hasCompletedOnboarding` flag. Self-correcting:
 * a user who archives all their homes gets funnelled back through
 * address → EPC → property. No new backend field required.
 *
 * Server component: reads cookies via `getServerSession`, no client-side
 * spinner-then-fetch dance. The fallback spinner below is only visible for
 * the brief moment while the redirect is being issued.
 */
export default async function PostLoginPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { user } = session;
  if (user.banned) redirect("/banned");
  if (user.mustChangePassword) redirect("/set-password");
  if (user.role === "admin") redirect("/admin");

  const properties = await listProperties();
  if (properties.length === 0) redirect("/onboarding/address");
  redirect("/dashboard");
}

/** Fallback for the split-second before Next issues the 3xx. */
export function PostLoginFallback() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4">
      <Spinner size="lg" aria-label="Signing you in…" />
      <p className="text-sm text-muted">Signing you in…</p>
    </main>
  );
}
