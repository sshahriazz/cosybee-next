import Image from "next/image";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { SectionHeader } from "@/app/components/ui/SectionContent";
import type { StaticImageData } from "next/image";
import hexaDevice from "@/public/energy.svg";
import hexaChart from "@/public/insights.svg";
import pound from "@/public/pound-sign.svg";

const BENEFITS: ReadonlyArray<{
  icon: StaticImageData;
  title: string;
  description: string;
}> = [
  {
    icon: hexaDevice,
    title: "Manage energy in one place",
    description:
      "Track heating, solar and energy use in real-time. Know exactly what's costing you money",
  },
  {
    icon: hexaChart,
    title: "Understand your usage",
    description:
      "See how weather, solar generation and your habits at home all affect your bills",
  },
  {
    icon: pound,
    title: "Reduce Your Bills",
    description: "Smart insights that show you where to cut costs",
  },
];

/**
 * "How will you benefit?" — three centered benefit columns separated by
 * vertical rules on desktop. This is the hero's "Learn more" scroll target
 * (`#benefits` — `scroll-mt` keeps the heading clear of the sticky header).
 */
export default function Benefits() {
  return (
    <Section id="benefits" spacing="lg" className="scroll-mt-24">
      <Container>
        <SectionHeader
          title="How will you benefit?"
          description="Simple insights that help you save money from day one"
          className="flex flex-col items-center"
        />

        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="flex flex-col items-center px-6 text-center lg:px-10"
            >
              <Image
                src={benefit.icon}
                alt=""
                aria-hidden
                className="h-13 w-15"
              />
              <h3 className="mt-5 text-lg font-extrabold text-foreground sm:text-xl">
                {benefit.title}
              </h3>
              <p className="mt-2 max-w-75 text-sm leading-relaxed text-muted sm:text-base">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
