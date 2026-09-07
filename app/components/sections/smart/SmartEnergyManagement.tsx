import Hexagon from "@/app/components/ui/Hexagon";
import {
  FeatureItem,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import featureImage from "@/public/smart/smart-home-integration.png";
import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export default function SmartEnergyManagement() {
  return (
    <Section surface="surface" spacing="md" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-32">
        {/* artwork */}
        <Image
          src={featureImage}
          alt="An EnergieBee hub beside the app's savings tips — £300 a year from a heat pump, £392 from solar — and 30 days billed at 15.4 kWh a day"
          sizes="(min-width: 1200px) 536px, (min-width: 1024px) calc(100vw - 240px), (min-width: 640px) calc(100vw - 80px), calc(100vw - 48px)"
          quality={100}
          className="z-9"
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
