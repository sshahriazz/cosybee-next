import {
  FeatureCard,
  GlyphName,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import Image, { type StaticImageData } from "next/image";
import deviceImg from "@/public/energy-saving-device.png";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export type FeatureCardContent = {
  glyph: GlyphName;
  title: string;
  description: string;
};

export type WhyEnergieBeeProps = {
  title?: string;
  lead?: string;
  cards?: FeatureCardContent[];
  /** Phone-mockup image on the right. */
  deviceSrc?: StaticImageData | string;
  deviceAlt?: string;
};

const DEFAULT_CARDS: FeatureCardContent[] = [
  {
    glyph: "sun",
    title: "Maximise Production",
    description:
      "Track real-time solar generation and get insights to optimise energy production.",
  },
  {
    glyph: "dollar",
    title: "Track Savings",
    description:
      "See exactly how much money you're saving with detailed analytics and historical comparisons.",
  },
  {
    glyph: "chart",
    title: "Smart Analytics",
    description:
      "Get detailed insights on production patterns, grid independence, and environmental impact.",
  },
];

export default function WhyEnergieBee({
  title = "Why Choose EnergieBee Solar?",
  lead = "Part of the EnergieBee app — everything you need to monitor and optimise your solar energy system.",
  cards = DEFAULT_CARDS,
  deviceSrc = deviceImg,
  deviceAlt = "energy analytics dashboard",
}: WhyEnergieBeeProps = {}) {
  // Two-column band: title + lead + feature cards on the left, phone mockup on
  // the right.
  return (
    <Section surface="base" spacing="lg">
      <Container
        size="wide"
        className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-6"
      >
        {/* text — left */}
        <div className="z-9 flex flex-col justify-center max-[1200px]:max-w-160 min-[1200px]:max-w-145">
          <SectionTitle align="left">{title}</SectionTitle>
          <SectionLead>{lead}</SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
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

        {/* phone — right. Wrapper owns the width; the image fills it via
            w-full h-auto so it scales proportionally. */}
        <div className="mx-auto w-full max-w-86.5">
          <Image
            src={deviceSrc}
            alt={deviceAlt}
            sizes="(min-width: 1200px) 346px, 280px"
            quality={85}
            className="h-auto w-full"
          />
        </div>
      </Container>
    </Section>
  );
}
