import { createFileRoute } from "@tanstack/react-router";
import { AppRoot } from "@/components/travel/app-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My trips — TravelFlow" },
      {
        name: "description",
        content: "Plan, review, and manage corporate travel with TravelFlow agents.",
      },
      { property: "og:title", content: "My trips — TravelFlow" },
      {
        property: "og:description",
        content: "Plan, review, and manage corporate travel with TravelFlow agents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <AppRoot />;
}
