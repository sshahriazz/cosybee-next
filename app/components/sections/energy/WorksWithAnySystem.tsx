import { CtaCard } from "@/app/components/ui/Cta";
import { Section } from "@/app/components/ui/Section";

/**
 * Standalone CTA section advertising broad solar-system compatibility.
 * Wraps a single CtaCard in page-edge padding so it can be dropped
 * between marketing sections.
 */
export default function WorksWithAnySystem() {
  return (
    <Section spacing="none" surface="surface">
      <div className="mx-auto max-w-360 pb-11 pt-4 px-4 lg:px-30">
        <CtaCard
          title="Works with any energy setup"
          description={
            "Compatible with smart meters, inverters, batteries, and EV chargers from all major brands. Plug and play setup in minutes."
          }
          buttonText="Get started"
          href="/download-app"
        />
      </div>
    </Section>
  );
}
