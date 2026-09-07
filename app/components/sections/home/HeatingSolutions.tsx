import Hexagon from "@/app/components/ui/Hexagon";
import { FeatureCard, SectionTitle } from "@/app/components/ui/SectionContent";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import featureImage from "@/public/homepage-images/heating-solutions.png";

/**
 * "Heating Solutions" — same layout as WhyEnergieBeeSolar, with the
 * positions flipped: artwork on the left, title + check-glyph feature
 * cards on the right, cream decorative hex bleeding in from the
 * top-right (instead of top-left).bg-[#f7f7f7]
 */
export default function HeatingSolutions() {
  return (
    <Section spacing="lg" surface="none" className="text-foreground ">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1fr_1fr] min-[1200px]:gap-38">
        {/* cream decorative hex bleeding from the top-right */}
        <Hexagon
          color="#F7F2E1"
          className="pointer-events-none absolute -left-30 sm:left-auto -top-10 w-[18rem] sm:-right-36 sm:w-88 lg:w-76.75"
        />
        {/* artwork — left. Ordered after the text below 1200px, where the
            single column reads title first. */}
        <Image
          src={featureImage}
          alt="A radiator valve and a 20°C room thermostat beside the app, working a 52 m² home's heating potential from C up to A"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9 order-2 min-[1200px]:order-1"
        />
        {/* text — right */}
        <div className="order-1 min-[1200px]:order-2 min-[1200px]:max-w-183.5 md:max-w-153.5 flex flex-col  z-9">
          <SectionTitle>Heating Solutions</SectionTitle>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureCard
              glyph="solar"
              title="Live Solar Production Tracking"
              descClassName="whitespace-pre-line"
              description={
                "Track solar production in real time.\n See how sunlight shapes your energy balance."
              }
            />
            <FeatureCard
              glyph="weather"
              title="Weather-Based Forecasts"
              descClassName="whitespace-pre-line"
              description={
                "See how weather affects your home energy.\n Plan ahead with clearer visibility."
              }
            />
            <FeatureCard
              glyph="energy"
              title="Daily Energy Overview"
              descClassName="whitespace-pre-line"
              description={
                "Understand how energy changes throughout the day. See patterns and peak demand."
              }
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
