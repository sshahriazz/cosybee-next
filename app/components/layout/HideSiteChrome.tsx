"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the global marketing chrome (site Navbar / Footer) on the routes that
 * render their own standalone shell. Wraps server children and simply omits
 * them on those paths.
 *
 *  - `/admin` — the console has its own header and account menu, which the
 *    marketing navbar would duplicate.
 *  - `/preview` — the sandbox gate. Everything behind it is meant to be
 *    invisible, and a nav listing every page would undo that.
 *
 * `/onboarding` is deliberately NOT in that list. It used to be — the funnel
 * rendered a minimal branded header of its own — but it now uses the same site
 * navbar as everywhere else a signed-in user goes, so the header stays
 * consistent through the flow. Don't re-add it without that context.
 *
 * (Was `HideOnAdmin` until the gate arrived and made the name a lie.)
 */
export function HideSiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/preview")) {
    return null;
  }
  return <>{children}</>;
}
