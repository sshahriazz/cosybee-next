import { CtaCard } from "@/app/components/ui/Cta";
import { Section } from "@/app/components/ui/Section";

/**
 * Standalone CTA section advertising broad smart-home compatibility.
 * Wraps a single CtaCard in page-edge padding so it can be dropped
 * between marketing sections.
 */
export default function WorksWithAnySystem() {
  return (
    <Section spacing="none">
      <div className="mx-auto max-w-360 pb-11 pt-4 px-4 lg:px-30">
        <CtaCard
          title="Works with any solar system"
          description="Compatible with all major solar panel brands and inverters. Whether you have a small residential system or a larger commercial installation."
          buttonText="Learn more"
          href="/solar"
          descClassName={"max-w-170"}
        />
      </div>
    </Section>
  );
}
