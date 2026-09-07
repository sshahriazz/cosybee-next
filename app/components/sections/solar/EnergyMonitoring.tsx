import Hexagon from "@/app/components/ui/Hexagon";
import {
  FeatureItem,
  type GlyphName,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import featureImage from "@/public/solar/real-time-energy-monitoring.png";
import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export type FeatureItemContent = {
  /** Hex badge glyph; falls back to the check mark when omitted. */
  glyph?: GlyphName;
  title: string;
  description: string;
};

export type EnergyMonitoringProps = {
  title?: string;
  features?: FeatureItemContent[];
};

const DEFAULT_FEATURES: FeatureItemContent[] = [
  {
    glyph: "solar",
    title: "Live Solar Production Tracking",
    description:
      "Monitor your solar panel energy production in real-time. See exactly how much energy you're generating with instant updates.",
  },
  {
    glyph: "weather",
    title: "Weather-Based Forecasts",
    description:
      "Get accurate predictions for your solar energy output based on upcoming weather patterns, helping you plan energy usage effectively.",
  },
  {
    glyph: "energy",
    title: "Daily Energy Overview",
    description:
      "View comprehensive daily energy production with visual graphs showing peak generation times and total output.",
  },
];

export default function EnergyMonitoring({
  title = "Real-Time Energy Monitoring",
  features = DEFAULT_FEATURES,
}: EnergyMonitoringProps = {}) {
  return (
    <Section surface="surface" spacing="md" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1fr_1.25fr] min-[1200px]:gap-32">
        {/* artwork */}
        <Image
          src={featureImage}
          alt="Rooftop solar panels beside the EnergieBee app, showing today's solar cycle and a live 170 W flow into the house"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9 object-cover object-right"
        />
        {/* text */}
        <div className="relative min-[1200px]:static z-9 flex flex-col min-[1200px]:max-w-165">
          {/* cream decorative hex bleeding from the top-right */}
          <Hexagon
            color="#F7F2E1"
            className="-z-10 pointer-events-none absolute -left-30 sm:left-auto -top-13.5 w-[18rem] sm:-right-27 sm:w-88 lg:w-76.75"
          />
          <SectionTitle>{title}</SectionTitle>
          <div className="mt-6 md:mt-8 space-y-8">
            {features.map((f) => (
              <FeatureItem
                key={f.title}
                glyph={f.glyph}
                title={f.title}
                description={f.description}
                descWidth="w-full"
              />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
