import { FeatureItem, SectionTitle } from "@/app/components/ui/SectionContent";
import Image from "next/image";
import type { FeatureItemContent } from "./EnergyMonitoring";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import DecorHex from "@/app/components/ui/DecorHex";
import featureImage from "@/public/solar/energy-and-savings-analytics.png";

export type EnergyAnalyticsProps = {
  title?: string;
  features?: FeatureItemContent[];
};

const DEFAULT_FEATURES: FeatureItemContent[] = [
  {
    glyph: "savings",
    title: "Savings Calculator",
    description:
      "Track exactly how much money you're saving with solar. See monthly comparisons and cumulative savings over time.",
  },
  {
    glyph: "energy",
    title: "Grid Independence Metrics",
    description:
      "Monitor your energy independence level. Understand how much of your power comes from solar vs. the grid.",
  },
  {
    glyph: "carbon",
    title: "Carbon Footprint Impact",
    description:
      "Visualise your positive environmental impact with CO2 reduction metrics. See how much you're helping the planet.",
  },
];

export default function EnergyAnalytics({
  title = "Energy & Savings Analytics",
  features = DEFAULT_FEATURES,
}: EnergyAnalyticsProps = {}) {
  // Two-column band: title + features on the left, artwork on the right.
  return (
    <Section surface="base" spacing="lg">
      <Container
        size="wide"
        className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-6"
      >
        {/* cream decorative hex bleeding from the top-left */}
        <DecorHex side="left" className="-top-10" />
        {/* text — left */}
        <div className="z-9 flex flex-col justify-center max-[1200px]:max-w-160 min-[1200px]:max-w-160">
          <SectionTitle align="left">{title}</SectionTitle>
          <div className="mt-6 md:mt-8 space-y-8">
            {features.map((f) => (
              <FeatureItem
                key={f.title}
                glyph={f.glyph}
                title={f.title}
                description={f.description}
                descWidth="md:w-[80%]"
              />
            ))}
          </div>
        </div>

        {/* artwork — right */}
        <div className="z-9 mx-auto w-full">
          <Image
            src={featureImage}
            alt="EnergieBee's solar analytics: 41.8 g CO2 per kWh, 43% cleaner than the grid, and where the day's energy was routed"
            sizes="(min-width: 1440px) 1440px, 100vw"
            quality={100}
          />
        </div>
      </Container>
    </Section>
  );
}
