import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { FeatureCard, SectionTitle } from "@/app/components/ui/SectionContent";
import featureImage from "@/public/homepage-images/solar-forecasting.png";
import DecorHex from "@/app/components/ui/DecorHex";

/**
 * Home "Solar Forecasting" — title + 3 feature cards on the left, composed
 * artwork on the right. Same two-column rhythm as HomeEnergyManagement /
 * HeatingSolutions: one column below 1200px (text first, then the phone),
 * side by side above it.
 */
export default function HomeSolarForecasting() {
  return (
    <Section surface="surface" spacing="lg" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-6">
        {/* cream decorative hex bleeding from the top-right */}
        <DecorHex side="left" className="-top-10" />
        {/* text — left */}
        <div className="z-9 flex flex-col max-[1200px]:max-w-160 min-[1200px]:max-w-163.5">
          <SectionTitle align="left">Solar forecasting</SectionTitle>
          {/* <p className="mt-3 max-w-xl text-base leading-relaxed max-[1200px]:text-center text-[#545454]">
            A complete view of solar production, weather, and usage across the
            day.
          </p> */}
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureCard
              glyph="solar"
              title="Maximise production"
              description="See how your solar performs day by day."
            />
            <FeatureCard
              glyph="savings"
              title="Track savings"
              description="See how daily energy habits affect savings."
            />
            <FeatureCard
              glyph="insights"
              title="Smart insights"
              description="Understand patterns across your home energy."
            />
          </div>
        </div>
        {/* artwork — right */}
        <Image
          src={featureImage}
          alt="A rooftop array beside the app's solar cycle — sunrise 06:42, a 3.0 kW peak at 13:00, sunset 20:18 — and an Aug 26 bill of £4.82"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
      </Container>
    </Section>
  );
}
