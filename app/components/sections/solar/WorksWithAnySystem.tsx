import { CtaCard } from "@/app/components/ui/Cta";
import { Section } from "@/app/components/ui/Section";

export type WorksWithAnySystemProps = {
  title?: string;
  description?: string;
  buttonText?: string;
  href?: string;
};

/**
 * Standalone CTA section advertising broad solar-system compatibility.
 * Wraps a single CtaCard in page-edge padding so it can be dropped
 * between marketing sections. All copy is overridable so the same
 * section can be reused for other CTAs.
 */
export default function WorksWithAnySystem({
  title = "Works With Any Solar System",
  description = "Compatible with all major solar panel brands and inverters. Whether you have a small residential system or a larger commercial installation.",
  buttonText = "Get Started",
  href = "/download-app",
}: WorksWithAnySystemProps = {}) {
  return (
    <Section surface="base" spacing="none">
      <div className="mx-auto max-w-360 pb-20 pt-4 px-4 lg:px-30 bg-background">
        <CtaCard
          title={title}
          description={description}
          buttonText={buttonText}
          href={href}
          descClassName={"max-w-170"}
        />
      </div>
    </Section>
  );
}
