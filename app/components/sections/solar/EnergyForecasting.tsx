// import { CtaCard } from "@/app/components/ui/Cta";
import { MediaCard, SectionHeader } from "@/app/components/ui/SectionContent";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import forecastImg from "@/public/solar/simulated-solar-forecasts.png";
import recommendationsImg from "@/public/solar/smart-energy-usage-recommendations.png";
import { Section } from "../../ui/Section";
import DecorHex from "@/app/components/ui/DecorHex";
import { Container } from "@/app/components/ui/Container";

export default function EnergyForecasting() {
  return (
    <Section surface="surface" spacing="md" overflow="visible">
      {/* This band opts out of the section clip for its card shadows, so the
          hexes bring their own — without it the bleed would add page scroll.
          The wrapper spans the section rather than the (narrower) container,
          so it clips at the window edge and DecorHex still measures the rail
          from the window; the offsets are the band's padding less the usual
          -top-10 / -bottom-10. */}
      <div className="pointer-events-none absolute inset-0 overflow-x-clip">
        <DecorHex side="left" className="top-6 lg:top-10" />
        <DecorHex side="right" className="bottom-6 lg:bottom-10" />
      </div>
      <Container className="mx-auto max-w-235 px-4 lg:px-0">
        <SectionHeader
          className="relative z-10 flex flex-col items-center"
          title="Intelligent energy forecasting"
          description="EnergieBee uses advanced weather data and AI to predict your solar energy production, helping you plan energy usage and maximise savings"
        />

        <div className=" grid justify-center mt-6 gap-6 min-[870px]:grid-cols-2 lg:gap-8 relative z-9">
          <MediaCard
            media={
              <Image
                alt="Today's solar cycle in the app: sunrise 06:42, a 3.0 kW peak at 13:00, sunset 20:18, and a 44.5 kWh seven-day forecast"
                src={forecastImg}
                sizes="(min-width: 1024px) 256px, (min-width: 640px) 224px, 208px"
                className="w-52 self-start sm:w-56 lg:w-64"
              />
            }
            title="Simulated solar forecasts"
            description="Our advanced simulation engine analyses real-time weather data, historical solar patterns, and your system's specific characteristics to deliver highly accurate solar production forecasts for your home."
            bullets={[
              "AI-powered 7-day solar simulations",
              "Hourly generation predictions",
              "Cloud cover and weather impact analysis",
            ]}
          />
          <MediaCard
            media={
              <Image
                alt="The app's cleanest window to charge — 02:30 to 08:00 at 63.4 gCO2 per kWh, a shift that would cut 62 g, or 20%"
                src={recommendationsImg}
                sizes="(min-width: 1024px) 256px, (min-width: 640px) 224px, 208px"
                className="w-52 self-start sm:w-56 lg:w-64"
              />
            }
            title="Smart energy usage recommendations"
            description="Get intelligent notifications on the best times to use high-energy appliances based on solar production forecasts, maximising your energy independence and savings."
            bullets={[
              "Optimal usage timing alerts",
              "Peak production windows",
              "Battery charging optimisation",
            ]}
          />
        </div>
        {/* <div className="mx-auto max-w-225 mt-12 lg:mt-16">
        <CtaCard
          glyph="sun"
          glyphColor="#A3D055"
          title="Reduce energy bills by up to 40%"
          description="By using EnergieBee's smart forecasting and energy management recommendations, typical households can reduce their energy bills by 30-40%, maximising the value of their solar investment."
          buttonText="Start monitoring"
          href="/start"
          titleClassName="!text-[25px] "
          descClassName="!text-sm"
          buttonClassName="!text-lg"
        />
      </div> */}
      </Container>
    </Section>
  );
}
