import { CtaButton } from "@/app/components/ui/Cta";
import { Heading, Text } from "@/app/components/ui/Typography";
import PageHero from "@/app/components/ui/PageHero";
import heroBgImg from "@/public/Cover/energiebee-heating-cover.png";
import heroBgImgMobile from "@/public/Cover/energiebee-heating-cover-mobile.png";

export default function Hero() {
  return (
    <PageHero bgImage={heroBgImg} bgImageMobile={heroBgImgMobile}>
      <Heading as="h1" variant="display" className="whitespace-pre-line">
        {"Home heating \n"}
        <span className="text-[#EFDF18]">intelligence</span>
      </Heading>
      <Text variant="heroLead" className="mt-5 max-w-165">
        Predictive energy intelligence that helps you understand, optimise, and
        reduce your home heating consumption.
      </Text>
      <Text variant="heroLead" className="mt-5 max-w-165">
        Powered by high-accuracy forecasting models, real-time energy data, and
        climate-aware intelligence that reduces waste, cost, and carbon impact.
      </Text>
      <CtaButton href="/download-app" size="md" className="mt-10">
        Get started
      </CtaButton>
    </PageHero>
  );
}
