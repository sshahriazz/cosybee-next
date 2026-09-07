// import { HIVE_3_PLACEMENTS, HIVE_3_VIEWBOX } from "@/app/lib/hex";
import Hexagon from "@/app/components/ui/Hexagon";
// import SharedImageHexCluster from "@/app/components/ui/SharedImageHexCluster";
import {
  FeatureItem,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
// import sideImage from "@/public/energy-monitoring.png";
import HiveHexCluster from "@/app/components/ui/HiveHexCluster";
import deviceImg from "@/public/smart/energiebee-app-home-heating-spend-graph.png";
import beeDisplayImg from "@/public/ss-image/ss-small-10.png";
import smartSwitchImg from "@/public/ss-image/ss-small-1.png";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
export default function EnergyMonitoring() {
  return (
    <Section surface="surface" spacing="md" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-38">
        {/* uniform 3-hex hive cluster */}

        <HiveHexCluster
          className="mx-auto w-full max-w-100 sm:max-w-110 lg:max-w-125.5 z-9"
          gap={5}
          cornerInset={4}
          left={{
            src: beeDisplayImg,
            alt: "EnergieBee desktop display",
            color: "#C9CBCD",
          }}
          topRight={{
            src: smartSwitchImg,
            alt: "Smart switch on a wall",
            color: "#E9EAEC",
          }}
          bottomRight={{
            color: "#E9E19E",
            children: (
              <Image
                src={deviceImg}
                alt="energie Bee app screen"
                className="absolute left-1/2 top-[12%] w-[59%] -translate-x-1/2"
              />
            ),
          }}
        />
        {/* text */}
        <div className="relative min-[1200px]:static z-9 flex flex-col  min-[1200px]:max-w-163.5">
          {/* cream decorative hex bleeding from the top-right */}
          <Hexagon
            color="#F7F2E1"
            className="-z-10 pointer-events-none absolute -left-30 sm:left-auto -top-13.5 w-[18rem] sm:-right-27 sm:w-88 lg:w-76.75"
          />
          <SectionTitle>AI-Powered Insights</SectionTitle>
          <SectionLead>
            See what&apos;s happening across your home energy system.
          </SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="insights"
              title="Live Solar Tracking"
              description="Monitor solar production in real time."
            />
            <FeatureItem
              glyph="weather"
              title="Weather-Based Forecasts"
              description="Plan ahead with forecasts based on local weather conditions."
            />
            <FeatureItem
              glyph="energy"
              title="Daily Energy Overview"
              description="Understand production patterns and daily performance."
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
