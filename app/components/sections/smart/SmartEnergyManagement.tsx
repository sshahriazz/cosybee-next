import DecorHex from "@/app/components/ui/DecorHex";
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
        <DecorHex side="right" className="-top-10" />
        {/* artwork */}
        <Image
          src={featureImage}
          alt="An EnergieBee hub beside the app's savings tips — £300 a year from a heat pump, £392 from solar — and 30 days billed at 15.4 kWh a day"
          sizes="(min-width: 1200px) 536px, (min-width: 1024px) calc(100vw - 240px), (min-width: 640px) calc(100vw - 80px), calc(100vw - 48px)"
          quality={100}
          className="z-9"
        />

        {/* text — left */}
        <div className="z-9 flex flex-col  min-[1200px]:max-w-163.5">
          <SectionTitle>Smart home integration</SectionTitle>
          <SectionLead>
            Bring your solar system, battery and connected devices together in
            one intelligent platform.
          </SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="device"
              title="Connected devices"
              description="See how your smart home systems work together."
              descWidth="md:w-[85%]"
            />
            <FeatureItem
              glyph="energy"
              title="Smart energy management"
              description="AI-powered recommendations help you use, store and save energy more effectively."
            />
            <FeatureItem
              glyph="insights"
              title="Performance tracking"
              description="Monitor long-term system performance and solar investment value."
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
