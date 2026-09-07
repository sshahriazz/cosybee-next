import { CtaCard } from "@/app/components/ui/Cta";
import { MediaCard, SectionHeader } from "@/app/components/ui/SectionContent";
import { AppImage as Image } from "@/app/components/ui/AppImage";
import deviceImg from "@/public/smart/energiebee-energy-usage.png";
import deviceWeatherImg from "@/public/smart/energiebee-weather-forecasts.png";
import { Section } from "@/app/components/ui/Section";

export default function EnergyForecasting() {
  // Full-bleed band; overflow="visible" keeps the card shadows unclipped.
  return (
    <Section surface="surface" spacing="md" overflow="visible">
      <div className="mx-auto max-w-225 px-4 lg:px-0">
        <SectionHeader
          title="Intelligent energy forecasting"
          description="EnergieBee uses advanced weather data and AI to predict your solar energy production, helping you plan energy usage and maximise savings"
        />

        <div className=" grid justify-center mt-6 gap-6 sm:grid-cols-2 lg:gap-8">
          <MediaCard
            media={
              <Image
                alt="Simulated Solar Forecasts"
                src={deviceWeatherImg}
                sizes="(min-width: 1024px) 256px, (min-width: 640px) 190px, 180px"
                className="w-45 sm:w-47.5 lg:w-64"
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
                alt="Smart Energy Usage Recommendations"
                src={deviceImg}
                sizes="(min-width: 1024px) 256px, (min-width: 640px) 190px, 180px"
                className="w-45 sm:w-47.5 lg:w-64"
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
        <div className="mx-auto max-w-225 mt-12 lg:mt-16">
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
        </div>
      </div>
    </Section>
  );
}
