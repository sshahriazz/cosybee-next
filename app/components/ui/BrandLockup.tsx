import { AppImage as Image } from "@/app/components/ui/AppImage";
import { AppLink as Link } from "@/app/components/ui/AppLink";
import EnergieBeeLogo from "@/public/energiebee-black-logo.svg";
import EnergieBeeLogoOnDark from "@/public/energiebee-white-logo.svg";

/**
 * The brand lockup — mark plus wordmark — as the admin console header wears
 * it. Used by the standalone screens that sit outside the site chrome (the
 * auth shell, the sandbox gate) and need to say who they belong to without a
 * navbar to do it for them.
 *
 * Two logo files, not one: the mark is a single flat colour, so the black one
 * disappears against the dark theme's background. The white one takes over via
 * the `dark:hidden` swap used in Cta.tsx, and is `aria-hidden` so screen
 * readers meet the brand once, not twice.
 *
 * Both files are SVGs, which Next serves as-is from `/_next/static/media`
 * rather than proxying through `/_next/image` (see `dangerouslyAllowSVG` in
 * get-img-props). That is load-bearing for the sandbox gate: the proxy leaves
 * `_next/static` open and blocks `_next/image`, so a PNG here would render as
 * a broken image on the locked screen.
 *
 * `href` is optional on purpose. The auth shell links home; the gate does not,
 * because every route behind it is locked and the link would only bounce the
 * visitor back to the screen they are already looking at.
 *
 * A server component (no `"use client"`), so this ships no JS.
 */
export function BrandLockup({
  href,
  className = "",
}: {
  /** Wraps the lockup in a link to this path. Omit for a plain, inert mark. */
  href?: string;
  className?: string;
}) {
  const lockup = (
    <>
      <Image
        src={EnergieBeeLogo}
        alt="EnergieBee"
        className="h-11 w-auto dark:hidden"
        quality={85}
        loading="eager"
      />
      <Image
        src={EnergieBeeLogoOnDark}
        alt="EnergieBee"
        aria-hidden
        className="hidden h-11 w-auto dark:block"
        quality={85}
        loading="eager"
      />
      <span className="leading-[100%] font-bold text-foreground sm:text-2xl">
        energie<span className="font-medium">bee</span>
      </span>
    </>
  );

  const classes = `flex items-center gap-2.5 ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {lockup}
      </Link>
    );
  }
  return <div className={classes}>{lockup}</div>;
}
