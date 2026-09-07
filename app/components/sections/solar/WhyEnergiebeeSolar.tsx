import DecorHex from "@/app/components/ui/DecorHex";
import {
  FeatureCard,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import type { FeatureCardContent } from "./WhyEnergieBee";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import featureImage from "@/public/solar/why-choose-energiebee-solar.png";

export type WhyEnergieBeeSolarProps = {
  title?: string;
  lead?: string;
  cards?: FeatureCardContent[];
};

const DEFAULT_CARDS: FeatureCardContent[] = [
  {
    glyph: "sun",
    title: "Maximise production",
    description:
      "Track real-time solar generation and get insights to optimise energy production.",
  },
  {
    glyph: "pound",
    title: "Track savings",
    description:
      "See exactly how much money you're saving with detailed analytics and historical comparisons.",
  },
  {
    glyph: "chart",
    title: "Smart analytics",
    description:
      "Get detailed insights on production patterns, grid independence, and environmental impact.",
  },
];

export default function WhyEnergieBeeSolar({
  title = "Why choose EnergieBee solar?",
  lead = "Part of the EnergieBee app, everything you need to monitor and optimise your solar energy system.",
  cards = DEFAULT_CARDS,
}: WhyEnergieBeeSolarProps = {}) {
  return (
    <Section
      surface="base"
      spacing="none"
      className="py-16 pb-8 text-foreground lg:py-20 lg:pb-10"
    >
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-16">
        {/* cream decorative hex bleeding from the top-left */}
        <DecorHex side="left" className="-top-10" />
        {/* text — left */}
        <div className="min-[1200px]:max-w-163.5 flex flex-col z-9">
          <SectionTitle>{title}</SectionTitle>
          <SectionLead className="max-w-140">{lead}</SectionLead>
          <div className="mt-6 md:mt-8 space-y-4 lg:max-w-135">
            {cards.map((c) => (
              <FeatureCard
                key={c.title}
                glyph={c.glyph}
                title={c.title}
                description={c.description}
              />
            ))}
          </div>
        </div>

        {/* artwork — right */}
        <Image
          src={featureImage}
          alt="The EnergieBee app over a panelled roof: where the home's power is going, a £1.46 bill, 2.63p per kWh blended"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
      </Container>
    </Section>
  );
}
