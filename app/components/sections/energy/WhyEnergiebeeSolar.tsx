import DecorHex from "@/app/components/ui/DecorHex";
import {
  FeatureCard,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import featureImage from "@/public/energy/battery-and-solar-ready.png";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export default function WhyEnergieBeeSolar() {
  return (
    <Section
      spacing="none"
      surface="surface"
      className="py-16 pb-8 text-foreground lg:py-20 lg:pb-10"
    >
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-16">
        <DecorHex side="right" className="-top-10" />
        {/* artwork */}
        <Image
          src={featureImage}
          alt="A rooftop array and a Sunsynk inverter beside the app's live energy flow, with today running 96% on the grid at 12.6 kWh"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
        {/* text — left */}
        <div className="min-[1200px]:max-w-163.5 flex flex-col z-9">
          <SectionTitle>Battery + solar ready</SectionTitle>
          <SectionLead className="max-w-163.5">
            EnergieBee orchestrates your full energy stack — solar generation,
            battery storage, EV charging, and grid imports — to minimise cost at
            every hour.
          </SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureCard
              glyph="sun"
              title="Smart charging"
              description="Batteries and EVs charge from solar surplus first, off-peak grid second. The right power, the right time."
              descWidth="w-full"
            />
            <FeatureCard
              glyph="dollar"
              title="Grid export optimisation"
              description="Sell to the grid when prices are high, store when they're low. Maximise export value automatically."
              descWidth="w-full"
            />
            <FeatureCard
              glyph="home"
              title="Outage-aware"
              description="When the grid drops, batteries take over critical loads automatically - fridge, lights, internet stay on."
              descWidth="w-full"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
