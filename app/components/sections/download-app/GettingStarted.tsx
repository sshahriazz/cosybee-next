import { AppImage as Image } from "@/app/components/ui/AppImage";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { SectionHeader } from "@/app/components/ui/SectionContent";
import { HEX_PATH_BADGE } from "@/app/lib/hex";
import type { StaticImageData } from "next/image";
import downloadImg from "@/public/download-app/download_app-crop.png";
import accountImg from "@/public/download-app/create_account-crop.png";
import connectImg from "@/public/download-app/connect_home-crop.png";
import homeImg from "@/public/download-app/app_home-crop.png";

// A real sequence the user performs in order — numbering carries information.
const STEPS: ReadonlyArray<{
  title: string;
  description: string;
  image: StaticImageData;
}> = [
  {
    title: "Download the app",
    description:
      "Everything you need to manage your home's heating, in one app.",
    image: downloadImg,
  },
  {
    title: "Create your free account",
    description: "Start for free with tailored heating and energy tips.",
    image: accountImg,
  },
  {
    title: "Connect your home",
    description: "Link your home for smart heating and energy insights.",
    image: connectImg,
  },
  {
    title: "Everything in one place",
    description: "Monitor, manage, and optimise your home's energy with ease.",
    image: homeImg,
  },
];

/**
 * "Up and running in four steps" — one cream card per step: numbered hex
 * badge, title, description, and an app screenshot (the `-crop` mockups)
 * bleeding off the card's bottom edge. Cream + fixed dark text so the cards
 * read the same in both themes.
 */
export default function GettingStarted() {
  return (
    <Section spacing="lg">
      <Container className="max-w-7xl xl:px-0">
        <SectionHeader
          title="Up and running in four steps"
          description="From install to insight in one evening — the app guides you through each step."
        />

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(({ title, description, image }, i) => (
            <article
              key={title}
              className="flex flex-col overflow-hidden rounded-3xl bg-[#C7B7341A] px-6 pt-7"
            >
              {/* viewBox padded by half the stroke width so the centred
                  outline isn't clipped by the 100×86.6 box. */}
              <svg
                viewBox="-1.63 -1.63 103.26 89.86"
                className="h-12 w-14"
                aria-hidden
              >
                <path
                  d={HEX_PATH_BADGE}
                  fill="#FFF89D"
                  stroke="#D4C60F"
                  strokeWidth={3.25}
                />
                <text
                  x="50"
                  y="46"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="34"
                  fontWeight="800"
                  fill="#544E08"
                >
                  {String(i + 1).padStart(2, "0")}
                </text>
              </svg>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-[#26272B]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#3F4046] sm:text-base">
                {description}
              </p>

              {/* app screenshot — the crop mockup bleeds off the card's bottom
                  edge (last child, no bottom padding). */}
              <Image
                src={image}
                alt=""
                aria-hidden
                quality={85}
                placeholder="blur"
                sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 90vw"
                className="mt-auto h-auto w-full max-w-65 mx-auto pt-8"
              />
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
