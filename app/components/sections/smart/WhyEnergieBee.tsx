import {
  FeatureCard,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import featureImage from "@/public/smart/works-with-your-smart-home.png";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import DecorHex from "@/app/components/ui/DecorHex";

export default function WhyEnergieBee() {
  // Two-column band: title + lead + feature cards on the left, artwork on the
  // right. Tight bottom below 1200px — the WorksWithAnySystem CTA follows
  // directly on /smart, so this band hugs it.
  return (
    <Section surface="base" spacing="lg" className="pb-8 min-[1200px]:pb-20">
      <Container
        size="wide"
        className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-6"
      >
        {/* cream decorative hex bleeding from the top-right */}
        <DecorHex side="left" className="-top-10" />
        {/* text — left */}
        <div className="z-9 flex flex-col justify-center max-[1200px]:max-w-160 min-[1200px]:max-w-163">
          <SectionTitle align="left">Works with your smart home</SectionTitle>
          <SectionLead>
            Part of the EnergieBee app - everything you need to monitor and
            optimise your solar energy system.
          </SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureCard
              glyph="insights"
              title="Maximise production"
              description="Track real-time solar generation and get insights to optimise energy production."
              descWidth="max-w-[70%] sm:max-w-auto"
            />
            <FeatureCard
              glyph="savings"
              title="Track savings"
              description="See exactly how much money you're saving with detailed analytics and historical comparisons."
              descWidth="max-w-[70%] sm:max-w-auto"
            />
            <FeatureCard
              glyph="chart"
              title="Smart analytics"
              description="Get detailed insights on production patterns, grid independence, and environmental impact."
              descWidth="max-w-[70%] sm:max-w-auto"
            />
          </div>
        </div>

        {/* artwork — right */}
        <div className="z-9 mx-auto w-full">
          <Image
            src={featureImage}
            alt="An EnergieBee room display beside the app's live flow — 170 W solar, 350 W imported, 870 W to the house — and a £10.45 week"
            sizes="(min-width: 1200px) 523px, (min-width: 640px) calc(100vw - 80px), calc(100vw - 48px)"
            quality={100}
          />
        </div>
      </Container>
    </Section>
  );
}
