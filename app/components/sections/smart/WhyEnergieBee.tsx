import {
  FeatureCard,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import deviceImg from "@/public/smart/energiebee-app-energy-at-a-glance.png";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import Hexagon from "../../ui/Hexagon";

export default function WhyEnergieBee() {
  // Two-column band: title + lead + feature cards on the left, phone mockup on
  // the right. Tight bottom below 1200px — the WorksWithAnySystem CTA follows
  // directly on /smart, so this band hugs it.
  return (
    <Section surface="base" spacing="lg" className="pb-8 min-[1200px]:pb-20">
      <Container
        size="wide"
        className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-6"
      >
        {/* cream decorative hex bleeding from the top-right */}
        <Hexagon
          color="#F7F2E1"
          className="pointer-events-none absolute -left-30 -top-10 w-[18rem] sm:-left-36 sm:w-88 lg:w-76.75"
        />
        {/* text — left */}
        <div className="z-9 flex flex-col justify-center max-[1200px]:max-w-160 min-[1200px]:max-w-163">
          <SectionTitle align="left">Works With Your Smart Home</SectionTitle>
          <SectionLead>
            Part of the EnergieBee app - everything you need to monitor and
            optimise your solar energy system.
          </SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureCard
              glyph="insights"
              title="Maximise Production"
              description="Track real-time solar generation and get insights to optimise energy production."
              descWidth="max-w-[70%] sm:max-w-auto"
            />
            <FeatureCard
              glyph="savings"
              title="Track Savings"
              description="See exactly how much money you're saving with detailed analytics and historical comparisons."
              descWidth="max-w-[70%] sm:max-w-auto"
            />
            <FeatureCard
              glyph="chart"
              title="Smart Analytics"
              description="Get detailed insights on production patterns, grid independence, and environmental impact."
              descWidth="max-w-[70%] sm:max-w-auto"
            />
          </div>
        </div>

        {/* phone — right */}
        <div className="mx-auto w-full max-w-86.5">
          <Image
            src={deviceImg}
            alt="energy analytics dashboard"
            sizes="(min-width: 1200px) 346px, 280px"
            quality={85}
            className="h-auto w-full"
          />
        </div>
      </Container>
    </Section>
  );
}
