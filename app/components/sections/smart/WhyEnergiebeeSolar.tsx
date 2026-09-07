import Hexagon from "@/app/components/ui/Hexagon";
import {
  FeatureCard,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import HiveHexCluster from "@/app/components/ui/HiveHexCluster";
import deviceImg from "@/public/smart/energiebee-app-optimisation.png";
import gardenBlindsImg from "@/public/ss-image/ss-small-4.png";
import beeCloseupImg from "@/public/ss-image/ss-small-12.png";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export default function WhyEnergieBeeSolar() {
  return (
    <Section
      surface="surface"
      spacing="none"
      className="py-16 pb-8 text-foreground lg:py-20 lg:pb-10"
    >
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-16">
        {/* cream decorative hex bleeding from the top-left */}
        <Hexagon
          color="#F7F2E1"
          className="pointer-events-none absolute -left-30 -top-10 w-[18rem] sm:-left-36 sm:w-88 lg:w-76.75"
        />
        {/* text — left */}
        <div className="min-[1200px]:max-w-163.5 flex flex-col min-[550px]:max-[1200px]:items-center z-9">
          <SectionTitle>Automated Optimisation</SectionTitle>
          <SectionLead className="max-w-163.5 min-[550px]:max-[1200px]:text-center">
            Part of the EnergieBee app - everything you need to monitor and
            optimise your solar energy system.
          </SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureCard
              glyph="sun"
              title="Maximise Production"
              description="Track real-time solar generation and get insights to optimise energy production."
            />
            <FeatureCard
              glyph="dollar"
              title="Track Savings"
              description="See exactly how much money you're saving with detailed analytics and historical comparisons."
            />
            <FeatureCard
              glyph="chart"
              title="Smart Analytics"
              description="Get detailed insights on production patterns, grid independence, and environmental impact."
            />
          </div>
        </div>

        {/* hexagon cluster — same canonical hive shape as the rest of the page */}
        <HiveHexCluster
          cornerInset={4}
          className="mx-auto w-full max-w-105 sm:max-w-125 lg:max-w-120"
          left={{ src: gardenBlindsImg, color: "#D3D9CB" }}
          topRight={{ src: beeCloseupImg, color: "#D8A9B6" }}
          bottomRight={{
            color: "#E9E19E",
            children: (
              <Image
                src={deviceImg}
                alt="cosy bee app"
                className="absolute left-1/2 top-[12%] w-[68%] -translate-x-1/2"
              />
            ),
          }}
        />
      </Container>
    </Section>
  );
}
