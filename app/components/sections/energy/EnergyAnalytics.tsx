import { FeatureItem, SectionTitle } from "@/app/components/ui/SectionContent";
import featureImage from "@/public/energy/energy-and-savings-analytics.png";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import Hexagon from "../../ui/Hexagon";

export default function EnergyAnalytics() {
  // Two-column band: title + features on the left, artwork on the right.
  return (
    <Section surface="base" spacing="lg">
      <Container
        size="wide"
        className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-6"
      >
        <Hexagon
          color="#F7F2E1"
          className="pointer-events-none absolute -left-30 -top-10 w-[18rem] sm:-left-36 sm:w-88 lg:w-76.75 z-0"
        />
        {/* text — left */}
        <div className="z-9 flex flex-col justify-center max-[1200px]:max-w-160 min-[1200px]:max-w-136.5">
          <SectionTitle align="left">
            Energy &amp; Savings Analytics
          </SectionTitle>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="pound"
              title="Bill Forecasting"
              description="Project your monthly and annual electricity costs based on real consumption patterns — never get blindsided by a bill again."
              descWidth="w-full"
            />
            <FeatureItem
              glyph="energy"
              title="Self-Sufficiency Score"
              description="Measure what percentage of your power comes from your own solar and battery vs. the grid. Watch it climb."
              descWidth="w-full"
            />
            <FeatureItem
              glyph="carbon"
              title="Carbon Footprint Impact"
              description="Track lifetime CO2 savings from every smart automation and every renewable kilowatt-hour you produce."
              descWidth="w-full"
            />
          </div>
        </div>

        {/* artwork — right */}
        <div className="z-9 mx-auto w-full">
          <Image
            src={featureImage}
            alt="The app's solar tab: a £1.46 bill, £0.35 earned exporting 2.9 kWh, and a 41.8 g CO2 per kWh footprint — 43% cleaner than the grid"
            sizes="(min-width: 1440px) 1440px, 100vw"
            quality={100}
          />
        </div>
      </Container>
    </Section>
  );
}
