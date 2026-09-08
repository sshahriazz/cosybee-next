import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@heroui/react";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import EnergieBeeLogo from "@/public/energiebee-black-logo.svg";
import EnergieBeeLogoOnDark from "@/public/energiebee-white-logo.svg";
import { safeRedirect } from "@/app/lib/safe-redirect";
import { PRODUCTION_URL } from "@/app/lib/site";
import {
  GATE_COOKIE,
  isGateEnabled,
  isValidToken,
} from "@/app/lib/sandbox-gate";
import { UnlockForm } from "./UnlockForm";

export const metadata: Metadata = {
  title: "Private preview",
  robots: { index: false, follow: false },
};

/**
 * The unlock screen for the sandbox gate (`app/lib/sandbox-gate.ts`).
 *
 * `proxy.ts` sends every locked request here, and this route is one of the few
 * it leaves open — so the page has to make sense in three situations:
 *
 *  - gate not running (production, or no code configured): there is nothing to
 *    unlock, so don't advertise a lock that doesn't exist — go home;
 *  - already unlocked: someone hit /preview with a valid cookie, probably from
 *    a stale link — send them where they were going;
 *  - locked: show the form.
 *
 * The site's own Navbar and Footer are suppressed on this path (see
 * `HideSiteChrome`): the point of the gate is that nothing behind it is
 * visible, and a nav bar listing every page rather gives the game away.
 */
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { from } = await searchParams;
  const target = safeRedirect(typeof from === "string" ? from : null, "/");

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!isGateEnabled(host)) redirect("/");

  const cookieStore = await cookies();
  if (await isValidToken(cookieStore.get(GATE_COOKIE)?.value)) redirect(target);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-4 py-12">
      {/* The same lockup the admin console wears (AdminHeader.tsx): mark plus
       *  wordmark. Two files rather than one because the mark is a single flat
       *  colour — the black one vanishes against the dark theme's background,
       *  so the white one takes over, the `dark:hidden` swap used in Cta.tsx.
       *  Both are SVGs, which Next serves straight from /_next/static/media
       *  instead of proxying through /_next/image — the one thing that matters
       *  here, since the gate leaves the former open and blocks the latter. */}
      <div className="mb-8 flex items-center gap-2.5">
        <Image
          src={EnergieBeeLogo}
          alt="EnergieBee"
          className="h-11 w-auto dark:hidden"
          quality={85}
          loading="eager"
        />
        <Image
          src={EnergieBeeLogoOnDark}
          alt=""
          aria-hidden
          className="hidden h-11 w-auto dark:block"
          quality={85}
          loading="eager"
        />
        <span className="text-lg leading-[100%] font-bold text-foreground sm:text-xl">
          energie<span className="font-medium">bee</span>
        </span>
      </div>
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Private preview</Card.Title>
          <Card.Description>
            This build is still in development and isn&apos;t open to the
            public. Enter the access code to take a look.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <UnlockForm from={target} />
        </Card.Content>
        <Card.Footer>
          <span className="text-xs text-muted">
            Looking for the live site? It&apos;s at{" "}
            <a href={PRODUCTION_URL} className="underline hover:text-foreground">
              {PRODUCTION_URL.replace(/^https?:\/\//, "")}
            </a>
            .
          </span>
        </Card.Footer>
      </Card>
    </main>
  );
}
