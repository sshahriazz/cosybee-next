import { CtaButton } from "@/app/components/ui/Cta";
import { Heading, Text } from "@/app/components/ui/Typography";
import PageHero from "@/app/components/ui/PageHero";
import heroBgImg from "@/public/Cover/energiebee-smart-cover.png";
import heroBgImgMobile from "@/public/Cover/energiebee-smart-cover-mobile.png";

export default function Hero() {
  return (
    <PageHero
      bgImage={heroBgImg}
      bgImageMobile={heroBgImgMobile}
      imageAlt="hero image of smart "
    >
      <Heading as="h1" variant="display" className="whitespace-pre-line">
        {"Works with \n your "}
        <span className="text-[#EFDF18]">smart home</span>
      </Heading>
      <Text variant="heroLead" className="mt-5 max-w-145.5">
        Connect your solar system, battery and smart home devices to see
        everything in one place. AI-powered insights help you understand energy
        production, usage and savings — and make smarter decisions every day.
      </Text>
      <CtaButton href="/download-app" size="md" className="mt-10">
        Get started
      </CtaButton>
    </PageHero>
  );
}
