import DecorHex from "@/app/components/ui/DecorHex";
import { FeatureItem, SectionTitle } from "@/app/components/ui/SectionContent";
import featureImage from "@/public/heating/turn-energy-data-into-real-savings.png";
import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export default function TurnEnergyData() {
  return (
    <Section spacing="md" surface="surface" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-38">
        <DecorHex side="right" className="-top-10" />
        {/* artwork */}
        <Image
          src={featureImage}
          alt="The app's 30-day view at 15.4 kWh a day billed, beside a carbon card reading 41.8 g CO2 per kWh — 43% cleaner than the grid"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
        {/* text — left */}
        <div className="z-9 flex flex-col  min-[1200px]:max-w-163.5">
          <SectionTitle align="left">
            Turn energy data into real savings
          </SectionTitle>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="savings"
              title="Savings intelligence"
              description="Identify opportunities to reduce heating costs through smarter decisions."
              descWidth="md:max-w-[70%]"
            />
            <FeatureItem
              glyph="energy"
              title="Grid independence tracking"
              description="Measure how much energy your home is saving from external grid dependency."
            />
            <FeatureItem
              glyph="carbon"
              title="Carbon & efficiency metrics"
              description="Understand your environmental impact through clear, actionable energy metrics."
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
