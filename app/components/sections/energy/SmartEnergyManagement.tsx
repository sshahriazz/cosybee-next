import Hexagon from "@/app/components/ui/Hexagon";
import { FeatureItem, SectionTitle } from "@/app/components/ui/SectionContent";
import featureImage from "@/public/energy/smart-tariff-control.png";
import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export default function SmartEnergyManagement() {
  return (
    <Section spacing="md" surface="surface" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-36">
        {/* artwork */}
        <Image
          src={featureImage}
          alt="A Sunsynk inverter and battery beside the app's Agile price chart, flagging right now as expensive at 31.01p"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
        {/* text — left */}
        <div className="relative min-[1200px]:static z-9 flex flex-col min-[1200px]:max-w-163.5">
          {/* cream decorative hex bleeding from the top-left */}
          <Hexagon
            color="#F7F2E1"
            className="-z-10 pointer-events-none absolute -left-30 sm:left-auto -top-10 w-[18rem] sm:-right-36 sm:w-88 lg:w-76.75"
          />
          <SectionTitle>Smart Tariff Control</SectionTitle>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="pound"
              title="Dynamic Tariff Switching"
              description="Plug into time-of-use tariffs and let EnergieBee shift loads to the cheapest windows automatically."
              descWidth="w-full"
            />
            <FeatureItem
              glyph="savings"
              title="Battery Arbitrage"
              description="Charge from the grid at off-peak rates, discharge at peak. Earn the difference back to your wallet, hands-free."
              descWidth="w-full"
            />
            <FeatureItem
              glyph="energy"
              title="Peak Load Shaving"
              description="Smart limits trim your worst spikes so you never trigger demand surcharges or breaker trips."
              descWidth="w-full"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
