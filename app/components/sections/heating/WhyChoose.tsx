import Hexagon from "@/app/components/ui/Hexagon";
import {
  FeatureItem,
  SectionLead,
  SectionTitle,
} from "@/app/components/ui/SectionContent";
import featureImage from "@/public/heating/why-choose-energiebee.png";
import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";

const PROBLEMS = [
  "energy waste",
  "rising heating costs",
  "unnecessary carbon emissions",
];

export default function WhyChoose() {
  return (
    <Section spacing="md" surface="base" className="text-foreground">
      <Container className="grid grid-cols-1 items-center gap-12 min-[1200px]:grid-cols-2 min-[1200px]:gap-16">
        {/* artwork */}
        <Image
          src={featureImage}
          alt="The app's savings tips — £300 a year from a heat pump, £392 from solar — beside a blended 2.63p per kWh against a 33.75p standard rate"
          sizes="(min-width: 1440px) 1440px, 100vw"
          quality={100}
          className="z-9"
        />
        {/* text */}
        {/* Tablet (550–1200px) keeps the column capped at the desktop width,
            left-aligned with the rest of the page. */}
        <div className="relative min-[1200px]:static z-9 flex flex-col text-left min-[550px]:max-w-163.5">
          {/* cream decorative hex bleeding from the top-right */}
          <Hexagon
            color="#F7F2E1"
            className="-z-10 pointer-events-none absolute -left-30 sm:left-auto -top-13.5 w-[18rem] sm:-right-27 sm:w-88 lg:w-76.75"
          />
          <SectionTitle>Why Choose EnergieBee?</SectionTitle>
          <SectionLead className="max-w-163.5">
            Smarter energy. Lower cost. Smaller footprint.
          </SectionLead>
          <p className="mt-4 text-base text-muted">
            EnergieBee is designed to solve three problems at once:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-base text-left text-muted marker:text-muted">
            {PROBLEMS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-4 text-base max-w-135 text-muted">
            By combining forecasting intelligence with real-world energy
            behaviour, we help homes use only what they need — and nothing more.
          </p>
          <div className="mt-6 md:mt-8 space-y-4">
            <FeatureItem
              glyph="insights"
              title="Smarter by Design"
              description="Built on predictive models that continuously learn from real household energy patterns."
            />
            <FeatureItem
              glyph="savings"
              title="Built for Real Savings"
              description="Every optimisation is designed to reduce cost, not just display data."
            />
            <FeatureItem
              glyph="green"
              title="Built for a Greener Future"
              description="Less wasted energy means lower emissions — without changing your comfort or lifestyle."
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
