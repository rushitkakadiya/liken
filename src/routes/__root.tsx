import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CountryPromptModal } from "@/components/modals/CountryPromptModal";
import { initAuth } from "@/lib/auth";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_FULL_NAME,
  SITE_FAVICON_PATH,
  SITE_FAVICON_ICO,
  SITE_APPLE_TOUCH_ICON,
} from "@/lib/seo/site";

const FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-[#a8a0a3]">The page you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full btn-pink px-5 py-2.5 text-sm font-medium">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-[#a8a0a3]">Try refreshing or head home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-full btn-pink px-5 py-2.5 text-sm font-medium">Try again</button>
          <a href="/" className="rounded-full border border-white/10 px-5 py-2.5 text-sm">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0e090a" },
      { name: "application-name", content: SITE_FULL_NAME },
      { name: "apple-mobile-web-app-title", content: SITE_NAME },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "format-detection", content: "telephone=no" },
      { title: SITE_FULL_NAME },
      { name: "description", content: DEFAULT_DESCRIPTION },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: SITE_FAVICON_ICO, sizes: "any" },
      { rel: "icon", href: "/favicon-16x16.png?v=3", sizes: "16x16", type: "image/png" },
      { rel: "icon", href: SITE_FAVICON_PATH, sizes: "32x32", type: "image/png" },
      { rel: "icon", href: "/favicon-48x48.png?v=3", sizes: "48x48", type: "image/png" },
      { rel: "apple-touch-icon", href: SITE_APPLE_TOUCH_ICON, sizes: "180x180" },
      { rel: "manifest", href: "/manifest.webmanifest?v=3" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preload", href: FONT_STYLESHEET, as: "style" },
      { rel: "stylesheet", href: FONT_STYLESHEET },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildOrganizationJsonLd()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(buildWebSiteJsonLd()),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    void initAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <CountryPromptModal />
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: "#181516", color: "#f5f5f5", border: "1px solid rgba(255,255,255,0.08)" } }} />
    </QueryClientProvider>
  );
}
