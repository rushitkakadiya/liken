import {
  buildPageHead,
  DEFAULT_DESCRIPTION,
  SITE_FULL_NAME,
  SITE_NAME,
  type PageSeoInput,
} from "@/lib/seo/site";

const PRIVATE_ROBOTS = "noindex,nofollow" as const;

export const PAGE_SEO = {
  home: {
    path: "/",
    title: SITE_FULL_NAME,
    description:
      "Upload a photo and get outfit color combinations designed for your skin tone, occasion, and personal style.",
    robots: "index,follow" as const,
  },
  pricing: {
    path: "/pricing",
    title: `Pricing | ${SITE_FULL_NAME}`,
    description:
      "Color generation is free for everyone. Upgrade to Premium for country-based product suggestions and AI try-on.",
    robots: "index,follow" as const,
  },
  login: {
    path: "/login",
    title: `Login | ${SITE_FULL_NAME}`,
    description: `Sign in to continue styling with ${SITE_NAME}.`,
    robots: PRIVATE_ROBOTS,
  },
  signup: {
    path: "/signup",
    title: `Sign up | ${SITE_FULL_NAME}`,
    description: `Create your ${SITE_NAME} account and start styling for free.`,
    robots: PRIVATE_ROBOTS,
  },
  studio: {
    path: "/studio",
    title: SITE_FULL_NAME,
    description: "Upload a photo and generate outfit color combinations in the AI styling studio.",
    robots: PRIVATE_ROBOTS,
  },
  dashboard: {
    path: "/dashboard",
    title: `Dashboard | ${SITE_FULL_NAME}`,
    description: `View your saved looks and styling activity on ${SITE_NAME}.`,
    robots: PRIVATE_ROBOTS,
  },
  profile: {
    path: "/profile",
    title: `Profile | ${SITE_FULL_NAME}`,
    description: `Manage your ${SITE_NAME} profile and preferences.`,
    robots: PRIVATE_ROBOTS,
  },
  savedLooks: {
    path: "/saved-looks",
    title: `Saved Looks | ${SITE_FULL_NAME}`,
    description: `Browse and manage your saved outfit looks on ${SITE_NAME}.`,
    robots: PRIVATE_ROBOTS,
  },
  authCallback: {
    path: "/auth/callback",
    title: `Signing in | ${SITE_FULL_NAME}`,
    description: DEFAULT_DESCRIPTION,
    robots: PRIVATE_ROBOTS,
  },
  notFound: {
    path: "/404",
    title: `Page not found | ${SITE_FULL_NAME}`,
    description: "The page you are looking for does not exist.",
    robots: PRIVATE_ROBOTS,
  },
} satisfies Record<string, PageSeoInput>;

export function pageHead(key: keyof typeof PAGE_SEO) {
  return buildPageHead(PAGE_SEO[key]);
}
