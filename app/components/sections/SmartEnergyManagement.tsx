import DecorHex from "@/app/components/ui/DecorHex";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { FeatureItem, SectionTitle } from "@/app/components/ui/SectionContent";
import sideImg from "@/public/energy-management.png";
import SharedImageHexCluster from "@/app/components/ui/SharedImageHexCluster";
import { HIVE_3_PLACEMENTS, HIVE_3_VIEWBOX } from "@/app/lib/hex";
import { FeatureItemContent } from "./solar/EnergyMonitoring";

export type SmartEnergyManagementProps = {
  title?: string;
  features?: FeatureItemContent[];
  /** Side photo masked through the hex cluster on the right. */
  imageSrc?: string;
};

const DEFAULT_FEATURES: FeatureItemContent[] = [
  {
    glyph: "energy",
    title: "Battery optimisation",
    description:
      "Get intelligent recommendations on when to store or use your solar energy to maximise savings and reduce grid dependency.",
  },
  {
    glyph: "connect",
    title: "Smart device integration",
    description:
      "Connect to your smart home devices and optimise their energy usage based on your solar production patterns.",
  },
  {
    glyph: "savings",
    title: "ROI tracking",
    description:
      "Track your return on investment with detailed financial calculations. See exactly how long until your solar panels pay for themselves.",
  },
];

export default function SmartEnergyManagement({
  title = "Smart energy management",
  features = DEFAULT_FEATURES,
  imageSrc = sideImg.src,
}: SmartEnergyManagementProps = {}) {
  return (
    <Section
      spacing="none"
      surface="surface"
      className="py-20 text-foreground lg:py-22.5"
    >
      <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* cream decorative hex bleeding from the top-left */}
        <DecorHex side="left" className="-top-10" />
        {/* text — left */}
        <div className="z-9">
          <SectionTitle>{title}</SectionTitle>
          <div className="mt-8 space-y-8">
            {features.map((f) => (
              <FeatureItem
                key={f.title}
                glyph={f.glyph}
                title={f.title}
                description={f.description}
              />
            ))}
          </div>
        </div>

        {/* uniform 3-hex hive cluster */}
        <SharedImageHexCluster
          src={imageSrc}
          viewBox={HIVE_3_VIEWBOX}
          placements={HIVE_3_PLACEMENTS}
          className="mx-auto w-full max-w-100 sm:max-w-110 lg:max-w-125.5"
        />
      </Container>
    </Section>
  );
}
