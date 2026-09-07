import DecorHex from "@/app/components/ui/DecorHex";
import { FeatureItem, SectionTitle } from "@/app/components/ui/SectionContent";
import featureImage from "@/public/energy/whole-home-monitoring.png";
import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export default function EnergyMonitoring() {
  return (
    <Section spacing="md" surface="surface" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-16">
        <DecorHex side="right" className="-top-13.5" />
        {/* artwork */}
        <Image
          src={featureImage}
          alt="The app's weekly electricity overview — £10.45 spent, £3.26 of it standing charge — with a daily bar for each day from 8/21 to 8/27"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
        {/* text */}
        <div className="z-9 flex flex-col min-[1200px]:max-w-163.5">
          <SectionTitle>Whole-home monitoring</SectionTitle>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="energy"
              title="Live consumption tracking"
              description="Real-time view of how much power your home is using, where it's coming from, and where it's going."
              descWidth="md:w-[80%]"
            />
            <FeatureItem
              glyph="device"
              title="Per-device breakdown"
              description="Pinpoint the energy hogs in your home with AI-powered appliance disaggregation — no extra sensors needed."
            />
            <FeatureItem
              glyph="pound"
              title="Tariff-aware forecasting"
              description="See your projected bill at any moment of the day, so there are no end-of-month surprises."
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
