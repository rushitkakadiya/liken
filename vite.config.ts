// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const CLIENT_ENV_BLOCKLIST = /SECRET|SERVICE_ROLE|GEMINI|DATAFORSEO|FAL_KEY|API_KEY/i;

for (const key of Object.keys(process.env)) {
  if (key.startsWith("VITE_") && CLIENT_ENV_BLOCKLIST.test(key.slice(5))) {
    throw new Error(
      `${key} must not use the VITE_ prefix — API keys and service credentials belong in server-only env vars or Supabase app_secrets.`,
    );
  }
}

export default defineConfig({
  vite: {
    server: {
      host: true,
      port: 8080,
      allowedHosts: true,
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
