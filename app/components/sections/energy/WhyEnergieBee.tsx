import {
  FeatureCard,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import DecorHex from "@/app/components/ui/DecorHex";
import featureImage from "@/public/energy/why-choose-energiebee-energy.png";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export default function WhyEnergieBee() {
  // Two-column band: title + lead + feature cards on the left, artwork on the
  // right.
  return (
    <Section surface="base" spacing="lg">
      <Container
        size="wide"
        className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-6"
      >
        {/* cream decorative hex bleeding from the top-left */}
        <DecorHex side="left" className="-top-10" />
        {/* text — left */}
        <div className="z-9 flex flex-col justify-center max-[1200px]:max-w-160 min-[1200px]:max-w-155">
          <SectionTitle align="left">
            Why Choose EnergieBee Energy?
          </SectionTitle>
          <SectionLead>
            Part of the EnergieBee app — one dashboard for every kilowatt-hour,
            every device, every cost.
          </SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureCard
              glyph="house"
              title="See Everything"
              description="Grid, solar, battery, and individual devices — all on one timeline, with the same units and the same clarity."
            />
            <FeatureCard
              glyph="dollar"
              title="Track Savings"
              description="Every automation logged with its hard-dollar impact. Know what's working and what's not."
            />
            <FeatureCard
              glyph="chart"
              title="Smart Analytics"
              description="Trend detection, anomaly alerts, and bill projections — the analytics you'd build if you had the time."
            />
          </div>
        </div>

        {/* artwork — right */}
        <div className="mx-auto w-full">
          <Image
            src={featureImage}
            alt="The app splitting a day's demand 18% direct solar, 27% battery, 55% grid — beside an Aug 26 bill of £4.82, £1.26 of it earned exporting"
            sizes="(min-width: 1440px) 1440px, 100vw"
            quality={100}
          />
        </div>
      </Container>
    </Section>
  );
}
