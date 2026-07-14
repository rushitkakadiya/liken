import { createFileRoute } from "@tanstack/react-router";
import { buildSitemapXml } from "@/lib/seo/site";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async (): Promise<Response> =>
        new Response(buildSitemapXml(), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
