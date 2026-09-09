import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Section } from "@/app/components/ui/Section";
import { Heading, Text } from "@/app/components/ui/Typography";
import heroBgImg from "@/public/homepage-images/hero-bg-fallback.png";
import { downloadQrSvg } from "@/app/lib/download-qr";
import { HERO_VIDEO_LANDSCAPE } from "@/app/lib/hero-videos";
import HeroDownloadCta from "../download-app/HeroDownloadCta";
import HeroBackgroundVideo from "../download-app/HeroBackgroundVideo";

/**
 * Home hero — "One app. Total energy clarity." Background photo with the
 * device-aware download CTA on the left (store badge on phones, QR on
 * desktop — see HeroDownloadCta) and a product-video carousel on the right.
 */
export default async function HomeHero() {
  const qrSvg = await downloadQrSvg();

  return (
    <Section
      spacing="none"
      surface="dark"
      className="isolate flex flex-col justify-end min-h-[75vh] md:min-h-[93vh]"
    >
      {/* background photo + gradient overlay */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <Image
          src={heroBgImg}
          alt="Hero image - dashboard of EnergieBee app"
          fill
          // `priority` is deprecated in Next 16 — `preload` is its successor.
          preload
          fetchPriority="high"
          sizes="100vw"
          quality={85}
          placeholder="blur"
          className="object-cover object-center"
        />
      </div>

      {/* Background video layered over the photo: the photo paints
          immediately; the video covers it once frames arrive (faststart-
          encoded, so playback begins while still downloading). Mounted only
          at md+ — phones keep the photo and never fetch the file. Sits
          outside the aria-hidden wrapper because it also renders clickable
          play/mute controls at the hero's top-right corner. */}
      <HeroBackgroundVideo src={HERO_VIDEO_LANDSCAPE} />

      {/* gradient overlay — after the video in the same -z-10 layer so it
          darkens video and photo alike, keeping the copy legible */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(360deg,rgba(0,0,0,0.9)_15.16%,rgba(0,0,0,0.6)_48.87%,rgba(0,0,0,0)_120.19%)]"
      />

      <div className="relative mx-auto flex w-full max-w-360 items-center justify-between gap-10 pt-16 pb-24 px-6 sm:px-6 lg:px-30 lg:py-25 ">
        <div className="w-full justify-between items-end flex flex-wrap">
          <div>
            <Heading as="h1" variant="display">
              One app.
              <br />
              Total energy clarity.
            </Heading>
            <Text variant="heroLead" className="mt-5 max-w-129.5">
              <strong>EnergieBee</strong> shows how your home uses energy day by
              day. Understand heating, solar and energy balance in one place.
            </Text>
          </div>
          <div className="mt-8 w-fit">
            <HeroDownloadCta qrSvg={qrSvg} />
          </div>
        </div>
      </div>
    </Section>
  );
}
