import { createFileRoute } from "@tanstack/react-router";
import { buildRobotsTxt } from "@/lib/seo/site";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async (): Promise<Response> =>
        new Response(buildRobotsTxt(), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
