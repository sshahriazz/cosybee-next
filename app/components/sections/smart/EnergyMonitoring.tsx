import DecorHex from "@/app/components/ui/DecorHex";
import {
  FeatureItem,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import featureImage from "@/public/smart/ai-powered-insights.png";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
export default function EnergyMonitoring() {
  return (
    <Section surface="surface" spacing="md" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-38">
        <DecorHex side="right" className="-top-13.5" />
        {/* artwork */}
        <Image
          src={featureImage}
          alt="A rooftop array and the app's solar cycle in hand, beside a weekly electricity view: £10.45 spent, £3.26 of it standing charge"
          sizes="(min-width: 1200px) 524px, (min-width: 1024px) calc(100vw - 240px), (min-width: 640px) calc(100vw - 80px), calc(100vw - 48px)"
          quality={100}
          className="z-9"
        />
        {/* text */}
        <div className="z-9 flex flex-col  min-[1200px]:max-w-163.5">
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
