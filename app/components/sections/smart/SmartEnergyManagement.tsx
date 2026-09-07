import Hexagon from "@/app/components/ui/Hexagon";
import {
  FeatureItem,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import sideImg from "@/public/energy-management.png";
import SharedImageHexCluster from "@/app/components/ui/SharedImageHexCluster";
import { HIVE_3_PLACEMENTS, HIVE_3_VIEWBOX } from "@/app/lib/hex";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export default function SmartEnergyManagement() {
  return (
    <Section surface="surface" spacing="md" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-32">
        {/* uniform 3-hex hive cluster */}
        <SharedImageHexCluster
          src={sideImg.src}
          viewBox={HIVE_3_VIEWBOX}
          placements={HIVE_3_PLACEMENTS}
          className="mx-auto w-full max-w-100 sm:max-w-110 lg:max-w-125.5"
        />

        {/* text — left */}
        <div className="relative min-[1200px]:static z-9 flex flex-col  min-[1200px]:max-w-163.5">
          {/* cream decorative hex bleeding from the top-right */}
          <Hexagon
            color="#F7F2E1"
            className="-z-10 pointer-events-none absolute -left-30 sm:left-auto -top-10 w-[18rem] sm:-right-36 sm:w-88 lg:w-76.75"
          />
          <SectionTitle>Smart Home Integration</SectionTitle>
          <SectionLead>
            Bring your solar system, battery and connected devices together in
            one intelligent platform.
          </SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="device"
              title="Connected Devices"
              description="See how your smart home systems work together."
              descWidth="md:w-[85%]"
            />
            <FeatureItem
              glyph="energy"
              title="Smart Energy Management"
              description="AI-powered recommendations help you use, store and save energy more effectively."
            />
            <FeatureItem
              glyph="insights"
              title="Performance Tracking"
              description="Monitor long-term system performance and solar investment value."
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
