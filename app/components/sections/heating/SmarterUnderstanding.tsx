import { FeatureCard, SectionTitle } from "@/app/components/ui/SectionContent";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import featureImage from "@/public/heating/a-smarter-understanding-of-your-home.png";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import DecorHex from "@/app/components/ui/DecorHex";

export default function SmarterUnderstanding() {
  // Two-column band: title + feature cards on the left, artwork on the right.
  return (
    <Section surface="base" spacing="lg">
      <Container
        size="wide"
        className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-6"
      >
        {/* cream decorative hex bleeding from the top-left */}
        <DecorHex side="left" className="-top-10" />
        {/* text — left */}
        <div className="z-9 flex flex-col justify-center max-[1200px]:max-w-160 min-[1200px]:max-w-145">
          <SectionTitle align="left">
            A Smarter Understanding of Your Home
          </SectionTitle>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureCard
              glyph="energy"
              title="Battery Optimisation Insights"
              description="Improve how stored energy is used across your home system."
            />
            <FeatureCard
              glyph="home"
              title="Connected Home Signals"
              description="Prepare your home for real-time energy coordination and future smart integrations."
            />
            <FeatureCard
              glyph="weather"
              title="Indoor Air Quality Awareness"
              description="Monitor air quality conditions that affect comfort, health, and energy efficiency."
            />
          </div>
        </div>

        {/* artwork — right */}
        <div className="z-9 mx-auto w-full">
          <Image
            src={featureImage}
            alt="An EnergieBee room display beside the app, splitting a billed 14.96 kWh grid import 80% to the house and 20% to the battery"
            sizes="(min-width: 1440px) 1440px, 100vw"
            quality={100}
          />
        </div>
      </Container>
    </Section>
  );
}
