import { FeatureItem, SectionTitle } from "@/app/components/ui/SectionContent";
import featureImage from "@/public/heating/understand-and-optimise-your-home-energy-today.png";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import Hexagon from "../../ui/Hexagon";

export default function UnderstandOptimise() {
  // Two-column band: title + features on the left, artwork on the right.
  return (
    <Section surface="base" spacing="lg">
      <Container
        size="wide"
        className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1.25fr_1fr] min-[1200px]:gap-6"
      >
        {/* cream decorative hex bleeding from the top-left */}
        <Hexagon
          color="#F7F2E1"
          className="pointer-events-none absolute -left-30 -top-13.5 w-[18rem] sm:-left-27 sm:w-88 lg:w-76.75"
        />
        {/* text — left */}
        <div className="z-9 flex flex-col justify-center max-[1200px]:mx-auto max-[1200px]:max-w-160 min-[1200px]:max-w-160">
          <SectionTitle align="left">
            Understand and Optimise Your Home Energy Today
          </SectionTitle>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="insights"
              title="Real-Time Energy Forecasting"
              description="Predict heating demand using live usage patterns and system behaviour."
              descWidth="md:w-[60%]"
            />
            <FeatureItem
              glyph="weather"
              title="Weather-Adaptive Insights"
              description="Adjust energy expectations based on local climate conditions."
              descWidth="md:w-[60%]"
            />
            <FeatureItem
              glyph="energy"
              title="Daily Energy Overview"
              description="A simple breakdown of energy usage, efficiency, and production every day."
              descWidth="md:w-[60%]"
            />
          </div>
        </div>

        {/* artwork — right */}
        <div className="z-9 mx-auto w-full">
          <Image
            src={featureImage}
            alt="A smart radiator valve beside the app's heating tab — a Worcester Bosch combi at 95% efficiency, a £7,500 boiler upgrade grant"
            sizes="(min-width: 1440px) 1440px, 100vw"
            quality={100}
          />
        </div>
      </Container>
    </Section>
  );
}
