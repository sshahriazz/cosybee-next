import DecorHex from "@/app/components/ui/DecorHex";
import {
  FeatureItem,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
// import { CtaButton } from "@/app/components/ui/Cta";
import featureImage from "@/public/heating/energiebee-is-evolving-into-a-connected-home-energy-ecosystem.png";
import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

export default function ConnectedEcosystem() {
  return (
    <Section spacing="md" surface="surface" className="text-foreground">
      {/* Early-access launch banner. An <aside>, not a heading block: it sits
          above the section's own <h2>, so an <h3> here inverted the document
          order. Its headline is also deliberately smaller than SectionTitle —
          at 36px it out-shouted the heading it precedes. */}
      {/* <Container className="mb-20">
        <aside
          aria-label="Early access"
          className="flex flex-col gap-5 rounded-2xl border border-border bg-background p-6 sm:p-8 min-[1200px]:flex-row min-[1200px]:items-center min-[1200px]:justify-between min-[1200px]:p-10"
        >
          <div>
            <p className="text-base font-semibold leading-[100%] uppercase tracking-[0.18em] text-primary">
              Early access
            </p>
            <p className="mt-2 text-2xl font-extrabold leading-[100%] text-foreground sm:text-[28px]">
              Launching August 2026
            </p>
            <p className="mt-4 text-sm leading-[100%] text-muted sm:text-base">
              Be part of the first wave of connected home energy intelligence.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CtaButton href="/contact" size="sm">
              Register Interest
            </CtaButton>
          </div>
        </aside>
      </Container> */}
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-16">
        {/* cream decorative hex bleeding from the top-left */}
        <DecorHex side="left" className="-top-10" />
        {/* text — left */}
        <div className="min-[1200px]:max-w-163.5 flex flex-col z-9">
          <SectionTitle>
            EnergieBee is evolving into a connected home energy ecosystem
          </SectionTitle>
          <SectionLead className="max-w-160.5">
            Today we optimise and forecast energy. Tomorrow we actively connect
            and control it.
          </SectionLead>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="home"
              title="Home Energy Hub Integration"
              description="A central intelligence layer for managing energy across your entire home."
            />
            <FeatureItem
              glyph="connect"
              title="Smart Heating Connectivity"
              description="Real-time coordination between heating systems and energy intelligence."
            />
            <FeatureItem
              glyph="phone"
              title="Advanced Control Layer"
              description="Automation across rooms, devices, and energy sources for full system control."
            />
          </div>
        </div>

        {/* artwork — right */}
        <Image
          src={featureImage}
          alt="An EnergieBee hub and a 21.5° hybrid heating control beside the app's live energy flow — 170 W solar, 350 W imported, 870 W to the house"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
      </Container>
    </Section>
  );
}
