import Hexagon from "@/app/components/ui/Hexagon";
import { FeatureItem, SectionTitle } from "@/app/components/ui/SectionContent";
import featureImage from "@/public/heating/accurate-intelligence-for-a-smarter-greener-home.png";
import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export default function AccurateIntelligence() {
  return (
    <Section spacing="md" surface="surface" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-16">
        {/* artwork */}
        <Image
          src={featureImage}
          alt="An air source heat pump and a 20°C room thermostat beside the app, rating the home's heating potential C up to A"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
        {/* text */}
        <div className="relative min-[1200px]:static z-9 flex flex-col min-[1200px]:max-w-163.5">
          {/* cream decorative hex bleeding from the top-right */}
          <Hexagon
            color="#F7F2E1"
            className="-z-10 pointer-events-none absolute -left-30 sm:left-auto -top-13.5 w-[18rem] sm:-right-27 sm:w-88 lg:w-76.75"
          />
          <SectionTitle>
            Accurate Intelligence for a Smarter, Greener Home
          </SectionTitle>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="insights"
              title="High-Accuracy Energy Forecasting"
              description="Our models analyse real-time usage, system behaviour, and external conditions to predict heating demand with high precision."
              descWidth="w-full"
            />
            <FeatureItem
              glyph="weather"
              title="Climate-Aware Intelligence"
              description="We integrate live weather and environmental data to continuously adapt energy predictions and reduce wasted heating cycles."
              descWidth="w-full"
            />
            <FeatureItem
              glyph="energy"
              title="Efficiency-First System Design"
              description="Every insight is built to reduce unnecessary energy consumption — helping you save money while lowering your carbon footprint."
              descWidth="w-full"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
