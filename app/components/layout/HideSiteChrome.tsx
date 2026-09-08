"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the global marketing chrome (site Navbar / Footer) on the routes that
 * render their own standalone shell. Wraps server children and simply omits
 * them on those paths.
 *
 *  - `/admin` — the console has its own top bar.
 *  - `/preview` — the sandbox gate. Everything behind it is meant to be
 *    invisible, and a nav listing every page would undo that.
 */
export function HideSiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/preview")) {
    return null;
  }
  return <>{children}</>;
}
