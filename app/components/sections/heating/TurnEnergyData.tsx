import Hexagon from "@/app/components/ui/Hexagon";
import { FeatureItem, SectionTitle } from "@/app/components/ui/SectionContent";
import featureImage from "@/public/heating/turn-energy-data-into-real-savings.png";
import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export default function TurnEnergyData() {
  return (
    <Section spacing="md" surface="surface" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-38">
        {/* artwork */}
        <Image
          src={featureImage}
          alt="The app's 30-day view at 15.4 kWh a day billed, beside a carbon card reading 41.8 g CO2 per kWh — 43% cleaner than the grid"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
        {/* text — left */}
        <div className="relative min-[1200px]:static z-9 flex flex-col  min-[1200px]:max-w-163.5">
          {/* cream decorative hex bleeding from the top-right */}
          <Hexagon
            color="#F7F2E1"
            className="-z-10 pointer-events-none absolute -left-30 sm:left-auto -top-10 w-[18rem] sm:-right-36 sm:w-88 lg:w-76.75"
          />
          <SectionTitle align="left">
            Turn Energy Data Into Real Savings
          </SectionTitle>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="savings"
              title="Savings Intelligence"
              description="Identify opportunities to reduce heating costs through smarter decisions."
              descWidth="md:max-w-[70%]"
            />
            <FeatureItem
              glyph="energy"
              title="Grid Independence Tracking"
              description="Measure how much energy your home is saving from external grid dependency."
            />
            <FeatureItem
              glyph="carbon"
              title="Carbon & Efficiency Metrics"
              description="Understand your environmental impact through clear, actionable energy metrics."
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
