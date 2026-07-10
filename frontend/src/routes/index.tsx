import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { CinematicHero } from "@/components/landing/cinematic-hero";
import {
  TwoAxisSection,
  PillarsSection,
  ChampionsPreview,
  LandingFooter,
} from "@/components/landing/sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Unlisted — Kenya's Hidden Champions" },
      {
        name: "description",
        content:
          "The best Kenyan businesses you've never heard of — found, scored, and ranked. A repeatable discovery engine built on the two-axis model.",
      },
      { property: "og:title", content: "The Unlisted — Kenya's Hidden Champions" },
      {
        property: "og:description",
        content:
          "A discovery engine that ranks Kenyan businesses on Quality × Obscurity. Evidence-backed, sector-normalised, quarterly.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main>
      <Navbar />
      <CinematicHero />
      <TwoAxisSection />
      <PillarsSection />
      <ChampionsPreview />
      <LandingFooter />
    </main>
  );
}
