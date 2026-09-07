import {
  FeatureItem,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import featureImage from "@/public/smart/energy-and-savings.png";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import DecorHex from "@/app/components/ui/DecorHex";

export default function EnergyAnalytics() {
  // Two-column band: title + features on the left, artwork on the right.
  // Stacks text-then-artwork below 1200px.
  return (
    <Section surface="base" spacing="lg">
      <Container
        size="wide"
        className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-6"
      >
        {/* cream decorative hex bleeding from the top-left */}
        <DecorHex side="left" className="-top-13.5" />
        {/* text — left */}
        <div className="z-9 flex flex-col justify-center max-[1200px]:max-w-160 min-[1200px]:max-w-111.5">
          <SectionTitle align="left">Energy &amp; savings</SectionTitle>
          <SectionLead>
            Understand the impact of your energy choices.
          </SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="savings"
              title="Track savings"
              description="See how solar generation reduces your energy costs."
            />
            <FeatureItem
              glyph="energy"
              title="Energy independence"
              description="Understand how much energy comes from solar versus the grid."
            />
            <FeatureItem
              glyph="environment"
              title="Environmental impact"
              description="Track your carbon savings and environmental contribution."
            />
          </div>
        </div>

        {/* artwork — right */}
        <div className="z-9 mx-auto w-full">
          <Image
            src={featureImage}
            alt="The app's energy routing — 4% of the home ran without the grid today — beside a carbon reading of 41.8 g CO2 per kWh, 43% cleaner"
            sizes="(min-width: 1200px) 523px, (min-width: 640px) calc(100vw - 80px), calc(100vw - 48px)"
            quality={100}
          />
        </div>
      </Container>
    </Section>
  );
}
