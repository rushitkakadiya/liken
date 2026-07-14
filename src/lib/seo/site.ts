export const SITE_NAME = "liken";
export const SITE_FULL_NAME = "liken - AI Styling Studio";
export const SITE_ICON_PATH = "/fevicon.png";
export const SITE_FAVICON_PATH = "/fevicon-32.png";
export const SITE_TAGLINE = "Your AI stylist for colors that actually suit you";
export const DEFAULT_DESCRIPTION =
  "Discover outfit color combinations designed for your skin tone, occasion, and personal style.";
export const TWITTER_HANDLE = "@liken";

/** Hero image already used on the landing page — reused for social previews. */
export const OG_IMAGE_URL =
  "https://images.unsplash.com/photo-1492288991661-058aa541ff43?w=1200&h=630&fit=crop&q=80";

export const FAQ_ITEMS = [
  {
    q: "What does liken do?",
    a: "liken analyzes your photo to detect skin tone and undertone, then suggests outfit color combinations for occasions like office, casual, date night, and events.",
  },
  {
    q: "Do you sell clothes?",
    a: "No. liken focuses on color styling only. Premium users can see product suggestions in their country, but we do not sell clothing.",
  },
  {
    q: "What photo should I upload?",
    a: "A clear upper-body photo in natural light works best. You do not need a full-body picture.",
  },
  {
    q: "Is my photo stored?",
    a: "For now, photos stay in your browser session while you style. Upload only images you are comfortable using.",
  },
  {
    q: "What do I get with Premium?",
    a: "Free includes color generation. Premium adds country-based product suggestions and AI virtual try-on.",
  },
] as const;

export const PUBLIC_INDEXABLE_PATHS = ["/", "/pricing"] as const;

export const PRIVATE_PATHS = [
  "/dashboard",
  "/studio",
  "/profile",
  "/saved-looks",
  "/login",
  "/signup",
  "/auth/callback",
] as const;

export type RobotsDirective = "index,follow" | "noindex,nofollow";

export type PageSeoInput = {
  path: string;
  title: string;
  description: string;
  robots?: RobotsDirective;
  ogType?: string;
};

export function getSiteUrl() {
  const fromEnv =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
    (typeof process !== "undefined" && process.env?.SITE_URL) ||
    (typeof process !== "undefined" && process.env?.APP_URL) ||
    "";

  const normalized = String(fromEnv).trim().replace(/\/$/, "");
  if (normalized) return normalized;

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  return "http://localhost:8080";
}

export function buildCanonicalUrl(path: string) {
  const siteUrl = getSiteUrl();
  if (path === "/" || path === "") return `${siteUrl}/`;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildOrganizationJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}${SITE_ICON_PATH}`,
    description: DEFAULT_DESCRIPTION,
  };
}

export function buildWebSiteJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };
}

export function buildSoftwareApplicationJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function buildFaqPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function buildPageHead(input: PageSeoInput) {
  const canonical = buildCanonicalUrl(input.path);
  const robots = input.robots ?? "index,follow";
  const ogType = input.ogType ?? "website";

  return {
    meta: [
      { title: input.title },
      { name: "description", content: input.description },
      { name: "robots", content: robots },
      { name: "googlebot", content: robots },
      { property: "og:title", content: input.title },
      { property: "og:description", content: input.description },
      { property: "og:type", content: ogType },
      { property: "og:url", content: canonical },
      { property: "og:site_name", content: SITE_FULL_NAME },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:image:alt", content: SITE_FULL_NAME },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: TWITTER_HANDLE },
      { name: "twitter:title", content: input.title },
      { name: "twitter:description", content: input.description },
      { name: "twitter:image", content: OG_IMAGE_URL },
      { name: "twitter:image:alt", content: SITE_FULL_NAME },
    ],
    links: [{ rel: "canonical", href: canonical }],
  };
}

export function buildRobotsTxt() {
  const siteUrl = getSiteUrl();
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ].join("\n");
}

export function buildSitemapXml() {
  const siteUrl = getSiteUrl();
  const urls = PUBLIC_INDEXABLE_PATHS.map((path) => {
    const loc = path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`;
    const priority = path === "/" ? "1.0" : "0.8";
    const changefreq = path === "/" ? "weekly" : "monthly";
    return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}
