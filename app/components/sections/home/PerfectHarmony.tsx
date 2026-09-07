import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
// import { CtaButton } from "@/app/components/ui/Cta";
import {
  FeatureCard,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import featureImage from "@/public/homepage-images/everything-connected-in-one-place.png";
import Hexagon from "@/app/components/ui/Hexagon";

/**
 * "Everything in perfect harmony" — text + 3 feature items on the left,
 * composed artwork on the right.
 */
export default function PerfectHarmony() {
  return (
    <Section
      spacing="lg"
      className="bg-surface text-foreground dark:bg-none dark:bg-background"
    >
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-6">
        {/* cream decorative hex bleeding from the top-left */}
        <Hexagon
          color="#F7F2E1"
          className="pointer-events-none absolute -top-10 w-[18rem] sm:-left-36 -left-26 sm:w-88 lg:w-76.75"
        />
        {/* text — left */}
        <div className="min-[1200px]:max-w-170.5 flex flex-col min-[550px]:max-[1200px]:items-start z-9">
          <SectionTitle className="whitespace-pre-line">
            {"Everything connected \n in one place"}
          </SectionTitle>
          <SectionLead>
            A single app to see how your home performs in real conditions and
            understand your energy balance.
          </SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureCard
              glyph="house"
              descClassName="whitespace-pre-line"
              title="Unified view of your home"
              description="See heating, solar, and energy data side by side. Spot patterns instantly."
            />
            <FeatureCard
              glyph="connect"
              descClassName="whitespace-pre-line"
              title="Smart connections"
              description="Energy insights help your home adapt to changing conditions."
            />
            <FeatureCard
              glyph="phone"
              descClassName="whitespace-pre-line"
              title="Simplified information"
              description="Understand what is happening and why it changes."
            />
          </div>
          {/* <CtaButton href="/try" size="md" className="mt-10 w-fit">
            Experience the App
          </CtaButton> */}
        </div>
        {/* artwork — right. Above the fold (this section sits right below the
            hero), so it eager-loads rather than being flagged as an
            un-prioritised LCP image. */}
        <Image
          src={featureImage}
          alt="An EnergieBee hub on the wall and the app's live energy flow — 170 W of solar, 350 W imported, 870 W reaching the house"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
          priority
        />
      </Container>
    </Section>
  );
}
