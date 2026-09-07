import Image from "next/image";
// import AppStoreButton from "@/app/components/ui/AppStoreButton";
import { CtaArrow, CtaButton, CtaChevron } from "@/app/components/ui/Cta";
import { Section } from "@/app/components/ui/Section";
import deviceImg from "@/public/homepage-images/everything-connected-device-mockup.png";
import ctaBgImg from "@/public/cta-bg.png";
// import { APP_STORE_ID, PLAY_STORE_PACKAGE_NAME } from "@/app/lib/app-links";
// import GooglePlayButton from "../../ui/GooglePlayButton";

/**
 * Final CTA — phone mockup on the left, headline + two download CTAs on
 * the right, all inside a white rounded card sitting on a dark page.
 */
export default function ReadyToReduce() {
  return (
    <Section
      spacing="none"
      overflow="visible"
      surface="base"
      // className="max-w-360 mx-auto px-6 pb-20 pt-16 sm:px-10 lg:px-30 lg:pb-25 lg:pt-21"
    >
      <div className="max-w-360 mx-auto px-6 pb-20 pt-16 sm:px-10 lg:px-30 lg:pb-25 lg:pt-21">
        <div className="mx-auto max-w-360 isolate relative flex flex-col items-center gap-8 rounded-3xl bg-surface p-8 border border-border sm:p-10 lg:flex-row lg:gap-12 lg:p-14">
          {/* honeycomb backdrop — its own clipped layer rather than
              `overflow-hidden` on the card, because the phone below is taller
              than the card and is meant to spill past its top edge. */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
            <Image
              src={ctaBgImg}
              alt=""
              fill
              sizes="(min-width: 1440px) 1440px, 100vw"
              quality={100}
              className="object-cover object-right"
            />
            {/* scrim — heavier on mobile, where the centred copy sits right on
                top of the comb; on wide screens the comb fills the empty space
                to the right of the text and only needs a soft lead-in. */}
            {/* <div className="absolute inset-0 bg-linear-to-r from-surface via-surface/20 to-surface/5 lg:via-surface/85 lg:to-transparent" /> */}
          </div>
          {/* phone */}
          <div className="shrink-0 absolute left-15 bottom-0 hidden min-[1200px]:block">
            <Image
              src={deviceImg}
              alt="EnergieBee app preview"
              sizes="(min-width: 1024px) 210px, 175px"
              quality={85}
              className="h-auto overflow-hidden w-40 lg:w-55"
            />
          </div>
          <div className="h-auto hidden min-[1200px]:block w-44 lg:w-59"></div>
          {/* text + buttons */}
          <div className="relative flex-1 md:text-center min-[1200px]:text-left!">
            <p className="mt-1.5 mb-3 text-base text-[#424242] tracking-wider uppercase font-bold leading-[100%]">
              More time for what matters
            </p>
            <h3 className="text-2xl tracking-[-2%] leading-[110%] font-extrabold text-foreground sm:text-3xl min-[1200px]:text-[40px]!">
              Bring clarity to your home energy.
            </h3>
            <p className="mt-3 max-w-162.5 text-base tracking-wide leading-[150%] font-medium text-muted sm:text-[20px]">
              EnergieBee helps you understand your home energy in a simple and
              connected way. One system. One view. Total clarity.
            </p>{" "}
            <div className="mt-6 flex flex-wrap items-center md:justify-center gap-4 min-[1200px]:justify-start!">
              <CtaButton href="/download-app" size="sm" className="group gap-2">
                Download free app
                {/* <CtaArrow /> */}
                {/* <CtaChevron /> */}
              </CtaButton>
              {/* <AppStoreButton appId={APP_STORE_ID} />
            <GooglePlayButton packageName={PLAY_STORE_PACKAGE_NAME} /> */}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
