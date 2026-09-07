import Hexagon from "@/app/components/ui/Hexagon";
import { FeatureItem, SectionTitle } from "@/app/components/ui/SectionContent";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import featureImage from "@/public/solar/smart-energy-management.png";
import Image from "next/image";

export default function SmartEnergyManagement() {
  return (
    <Section surface="surface" spacing="md" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1fr_1.25fr] min-[1200px]:gap-20">
        {/* artwork */}
        <Image
          src={featureImage}
          alt="An EnergieBee hub beside the app reading a 6.5 kWp array with a 10.6 kWh battery, rating solar potential D up to A"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
        {/* text — right */}
        <div className="relative min-[1200px]:static z-9 flex flex-col  min-[1200px]:max-w-163.5">
          {/* cream decorative hex bleeding from the top-right */}
          <Hexagon
            color="#F7F2E1"
            className="-z-10 pointer-events-none absolute -left-30 sm:left-auto -top-10 w-[18rem] sm:-right-36 sm:w-88 lg:w-76.75"
          />
          <SectionTitle>Smart Energy Management</SectionTitle>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="energy"
              title="Battery Optimisation"
              description="Get intelligent recommendations on when to store or use your solar energy to maximise savings and reduce grid dependency."
              descWidth="md:w-[85%]"
            />
            <FeatureItem
              glyph="connect"
              title="Smart Device Integration"
              description="Connect to your smart home devices and optimise their energy usage based on your solar production patterns."
              descWidth="md:w-[85%]"
            />
            <FeatureItem
              glyph="savings"
              title="ROI Tracking"
              description="Track your return on investment with detailed financial calculations. See exactly how long until your solar panels pay for themselves."
              descWidth="md:w-[90%]"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
