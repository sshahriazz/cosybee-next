import { FeatureCard, SectionTitle } from "@/app/components/ui/SectionContent";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import Hexagon from "@/app/components/ui/Hexagon";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import featureImage from "@/public/homepage-images/energy-management.png";

/**
 * Home "Energy Management" — dark variant with title + 3 feature cards
 * on the left and composed artwork on the right.
 */
export default function HomeEnergyManagement() {
  return (
    <Section spacing="lg" surface="base" className="text-white">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-[1fr_1fr] min-[1200px]:gap-35">
        {/* artwork */}
        <Image
          src={featureImage}
          alt="The app's weekly electricity view — £10.45 spent, £3.26 of it standing charge — beside a day that ran 96% on the grid at 12.6 kWh"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
        {/* text — left */}
        <div className="relative min-[1200px]:static flex flex-col  z-9">
          {/* cream decorative hex bleeding from the top-left */}
          <Hexagon
            color="#F7F2E2"
            className="-z-10 pointer-events-none absolute -left-30 sm:left-auto -top-10 w-[18rem] sm:left-auto sm:-right-28 sm:w-88 lg:w-76.75"
          />
          <div className="max-w-163.5">
            <SectionTitle>Energy Management</SectionTitle>
            {/* <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
              A clear view of how energy is used, timed, and distributed across
              your home.
            </p> */}
            <div className="mt-6 md:mt-8 space-y-4">
              <FeatureCard
                glyph="energy"
                title="Energy Use"
                description={"See where and when energy is used."}
                descClassName="whitespace-pre-line"
              />
              <FeatureCard
                glyph="pound"
                title="Cost Awareness"
                description={"Understand how energy patterns affect costs."}
                descClassName="whitespace-pre-line"
              />
              <FeatureCard
                glyph="home"
                title="System Behaviour"
                description={
                  "See how weather, solar and home activity interact."
                }
                descClassName={"whitespace-pre-line"}
              />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
