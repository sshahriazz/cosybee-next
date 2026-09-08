"use client";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import { AppLink as Link } from "@/app/components/ui/AppLink";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
// import CosybeeLogo from "@/app/components/ui/CosybeeLogo";
import EnergieBeeLogo from "@/public/energiebee-brand-horizontal.svg";

import { CTA_BASE_CLASSES, CTA_SIZE_CLASSES } from "@/app/components/ui/Cta";
import { authClient } from "@/app/lib/auth-client";
import { UserMenu } from "./UserMenu";

/**
 * Two link sets — the navbar picks one at runtime based on session state.
 *
 * Marketing links are the current outward-facing site nav. App links are
 * for signed-in users on the product surface (dashboard + account). We
 * deliberately do NOT surface every marketing tab to a signed-in user —
 * they're on the app now, and the app is a distinct product with a
 * different mental model.
 */
const MARKETING_LINKS = [
  { label: "smart", href: "/smart" },
  { label: "heating", href: "/heating" },
  { label: "solar", href: "/solar" },
  { label: "energy", href: "/energy" },
  { label: "hive", href: "/hive" },
  { label: "learn", href: "/learn" },
  // { label: "shop", href: "/shop" },
];

const APP_LINKS = [
  { label: "Dashboard", href: "/energyflow-home" },
  { label: "Account", href: "/account" },
];

const MENU_ID = "site-mobile-menu";

/** The one place the header CTA's destination and wording are defined. */
const DOWNLOAD_CTA = { label: "Download free app", href: "/download-app" };

// function SearchIcon() {
//   return (
//     <svg
//       width="20"
//       height="20"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="1.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       aria-hidden="true"
//     >
//       <circle cx="11" cy="11" r="7" />
//       <path d="m20 20-3.5-3.5" />
//     </svg>
//   );
// }

// function UserIcon() {
//   return (
//     <svg
//       width="20"
//       height="20"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="1.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       aria-hidden="true"
//     >
//       <circle cx="12" cy="8" r="4" />
//       <path d="M4 21c0-4.418 3.582-7 8-7s8 2.582 8 7" />
//     </svg>
//   );
// }

/**
 * Hamburger that morphs into an X when `open`. Built from three absolutely
 * positioned <span> bars (not SVG <line>) so the transform pivot is always
 * the element's centre — iPad/Safari has long-standing bugs with
 * `transform-box: fill-box` on zero-area SVG lines. Pure GPU transforms,
 * motion-reduce-friendly.
 */
function MenuToggleIcon({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  const bar =
    "absolute left-1/2 top-1/2 h-[2px] rounded-full bg-[#C7B734] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none";
  return (
    <span aria-hidden="true" className={`relative inline-block ${className}`}>
      <span
        className={`${bar} w-4.25`}
        style={{
          transform: open
            ? "translate(-50%, -50%) rotate(45deg)"
            : "translate(-50%, calc(-50% - 8px))",
        }}
      />
      <span
        className={`${bar} w-6.25 ${open ? "opacity-0" : ""}`}
        style={{
          transform: open
            ? "translate(-50%, -50%) scaleX(0)"
            : "translate(-50%, -50%)",
        }}
      />
      <span
        className={`${bar} w-4.25`}
        style={{
          transform: open
            ? "translate(-50%, -50%) rotate(-45deg)"
            : "translate(-50%, calc(-50% + 8px))",
        }}
      />
    </span>
  );
}

export default function Navbar({
  activeHref,
}: {
  /** Optional override. When omitted, the active link is derived from
   *  the current URL via `usePathname()`. */
  activeHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const currentPath = activeHref ?? pathname;

  // Live session — flips the link set + reveals the user menu without a
  // full page reload. `isPending` is the initial suspense window before
  // better-auth's cookie check resolves; we render the marketing links
  // during that window so the first paint doesn't flash the wrong nav for
  // a signed-out visitor (the majority of first paints).
  const { data, isPending } = authClient.useSession();
  const signedIn = !isPending && !!data?.user;
  // 🔴 Admins keep the marketing nav — they've historically browsed the
  // site with the same top bar as visitors, and switching them to the app
  // nav would hide the marketing pages they still need to reach (product,
  // learn, etc.). The `/admin` shell is separate and already renders its
  // own header via `HideSiteChrome`, so this only affects admin browsing
  // OUTSIDE the admin console — where they act like a visitor.
  const isAdmin = !!data?.user?.role && data.user.role === "admin";
  const useAppNav = signedIn && !isAdmin;
  const NAV_LINKS = useAppNav ? APP_LINKS : MARKETING_LINKS;

  // A link is active when its href exactly matches the current path or
  // is a prefix of it (so `/solar/details` still highlights "solar").
  const isLinkActive = (href: string) => {
    if (href === "/") return currentPath === "/";
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  // Close on Escape or outside click; only mount the listeners while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-foreground text-white">
      <nav
        ref={navRef}
        className="relative mx-auto flex h-16 max-w-360 items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-30"
      >
        <Link href="/" aria-label="Cosybee home" className="shrink-0">
          {/* <CosybeeLogo className="h-12 w-auto lg:h-14" /> */}
          <Image
            src={EnergieBeeLogo}
            alt="EnergieBee"
            className="h-11 w-auto"
            quality={85}
            loading="eager"
          />
        </Link>

        <ul className="hidden items-center mr-4 gap-8 min-[1150px]:flex xl:gap-12">
          {NAV_LINKS.map((link) => {
            const isActive = isLinkActive(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`text-base font-medium tracking-wide leading-[100%] transition-colors hover:text-white ${
                    isActive ? "text-white" : "text-white/80"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3 text-muted sm:gap-5">
          {/* Navbar is always dark: tint the ghost button's hover/pressed
              backgrounds white (the default light-gray pressed bg shows as a
              blended white box when the menu is open). */}
          {/* Hidden for now — theme toggle and login/signup.
          <ThemeToggle className="text-white [--button-bg-hover:#ffffff1f] [--button-bg-pressed:#ffffff33]" />
          <UserMenu /> */}
          {/* <button
            type="button"
            aria-label="Search"
            className="hidden text-muted transition-colors hover:text-white sm:inline-flex"
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            aria-label="Account"
            className="hidden text-muted transition-colors hover:text-white sm:inline-flex"
          >
            <UserIcon />
          </button> */}
          {/* Right side: signed-in users get the avatar UserMenu (Profile,
              Security, Admin, Sign out). Anonymous visitors get the
              "Download free app" CTA — the primary conversion goal for the
              marketing surface, and hidden below `sm` because at that
              width the logo + hamburger already fill the bar (the mobile
              menu carries the CTA instead). */}
          {/* Signed-in users get the avatar menu (Profile, Security, Admin,
              Sign out). Admins ALSO get the avatar menu even though they
              keep the marketing links — the menu is how they reach the
              admin console + sign-out. Only fully anonymous visitors see
              the download CTA. */}
          {signedIn ? (
            <UserMenu />
          ) : (
            <Link
              href={DOWNLOAD_CTA.href}
              className={`max-sm:hidden ${CTA_BASE_CLASSES} ${CTA_SIZE_CLASSES.sm}`}
            >
              {DOWNLOAD_CTA.label}
            </Link>
          )}

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={MENU_ID}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-md transition-colors hover:bg-surface/5 min-[1150px]:hidden"
          >
            <MenuToggleIcon open={open} className="h-9 w-7" />
          </button>
        </div>

        {/* Mobile menu panel — absolutely positioned below the header so it
            overlays content rather than pushing it down. Animated via
            transform + opacity only, which the compositor can run off-thread
            (no layout / paint per frame). */}
        <div
          id={MENU_ID}
          aria-hidden={!open}
          className={`absolute inset-x-0 top-full origin-top border-t border-neutral-800 bg-black/95 backdrop-blur shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)] min-[1150px]:hidden
            transition-[opacity,transform] duration-300 ease-out
            motion-reduce:transition-none
            ${
              open
                ? "opacity-100 translate-y-0"
                : "pointer-events-none -translate-y-3 opacity-0"
            }`}
          style={{ willChange: "transform, opacity" }}
        >
          <ul className="flex flex-col gap-1 px-4 py-4 sm:px-6">
            {NAV_LINKS.map((link) => {
              const isActive = isLinkActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    tabIndex={open ? 0 : -1}
                    className={`block rounded-md px-2 py-2 text-base font-medium tracking-wide transition-colors hover:bg-surface/5 hover:text-white ${
                      isActive ? "text-white" : "text-muted"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            {/* The CTA the header hides below `sm`. Full width here, matching
                how the links above fill the panel. Suppressed for signed-in
                users — the UserMenu already covers the right side of the bar
                at every width. */}
            {!signedIn && (
              <li className="mt-2 border-t border-neutral-800 px-2 pt-4 sm:hidden">
                <Link
                  href={DOWNLOAD_CTA.href}
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  className={`w-full ${CTA_BASE_CLASSES} ${CTA_SIZE_CLASSES.sm}`}
                >
                  {DOWNLOAD_CTA.label}
                </Link>
              </li>
            )}
            {/* <li className="mt-2 flex items-center gap-6 border-t border-neutral-800 px-2 pt-4 sm:hidden">
              <button
                type="button"
                aria-label="Search"
                tabIndex={open ? 0 : -1}
                className="text-muted transition-colors hover:text-white"
              >
                <SearchIcon />
              </button>
              <button
                type="button"
                aria-label="Account"
                tabIndex={open ? 0 : -1}
                className="text-muted transition-colors hover:text-white"
              >
                <UserIcon />
              </button>
            </li> */}
          </ul>
        </div>
      </nav>
    </header>
  );
}
