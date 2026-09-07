import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { SectionHeader } from "@/app/components/ui/SectionContent";
import hexaChart from "@/public/hexa-wand-icon.svg";
// import hexaSun from "@/public/hexa-connector-icon.svg";
import hexaSun from "@/public/connection.svg";
import hexaDollar from "@/public/hexa-dollar.svg";
import DecorHex from "@/app/components/ui/DecorHex";

const POINTS = [
  {
    icon: hexaChart,
    title: "See Where Your Money Goes",
    description:
      "Track heating, solar, and energy use in real-time. Know exactly what's costing you money.",
  },
  {
    icon: hexaSun,
    title: "Control From Anywhere",
    description:
      "Adjust heating, monitor solar production, and manage energy — all from your phone.",
  },
  {
    icon: hexaDollar,
    title: "Reduce Your Bills",
    description:
      "Get smart insights that show you how to cut energy costs. Start saving from day one.",
  },
];

/**
 * "Why thousands choose EnergieBee" — centered header followed by a
 * 3-column grid of icon + title + short description.
 */
export default function WhyThousands() {
  return (
    <Section
      spacing="none"
      className="bg-[linear-gradient(117.77deg,#F6F9FB_12.42%,#F3F9F5_51.01%,#EFF7FB_73.68%,#F0F0FB_95.76%)]"
    >
      <Container className="py-20 lg:py-25">
        {/* cream decorative hex bleeding from the top-right */}
        <DecorHex side="right" color="#fff" className="top-9 lg:w-67.5" />
        <div className="relative z-9">
          <SectionHeader
            title="Why thousands choose EnergieBee"
            description="Simple insights that help you save money from day one"
          />
          <div className="relative z-9 mx-auto min-[1000px]:mt-10 grid max-w-360 grid-cols-1 py-9 max-[1000px]:pb-0 min-[1000px]:grid-cols-3">
            {POINTS.map((p) => (
              <div
                key={p.title}
                className="min-[1000px]:border-r border-b min-[1000px]:border-b-0  border-[#EBEBEB] p-10 text-center last:border-r-0 last:border-b-0"
              >
                <Image
                  src={p.icon}
                  alt=""
                  aria-hidden
                  className="mx-auto h-12.5 w-auto"
                />
                <h3 className="mt-4 text-[22px] font-semibold text-foreground">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
