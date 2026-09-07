import { CtaButton } from "@/app/components/ui/Cta";
import { Heading, Text } from "@/app/components/ui/Typography";
import PageHero from "@/app/components/ui/PageHero";
import heroBgImg from "@/public/Cover/energiebee-energy-cover.png";
import heroBgImgMobile from "@/public/Cover/energiebee-energy-cover-mobile.png";

export default function Hero() {
  return (
    <PageHero bgImage={heroBgImg} bgImageMobile={heroBgImgMobile}>
      <Heading as="h1" variant="display">
        Total <span className="text-[#EFDF18]">energy control</span>
      </Heading>
      <Text variant="heroLead" className="mt-5 max-w-129.5">
        Track every watt your home uses — across grid, solar, battery, and
        individual devices. One dashboard, one source of truth, real savings.
      </Text>
      <CtaButton href="/download-app" size="md" className="mt-10">
        Get started
      </CtaButton>
    </PageHero>
  );
}
