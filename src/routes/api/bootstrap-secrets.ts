import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const SECRET_KEYS = [
  "gemini_api_key",
  "dataforseo_login",
  "dataforseo_password",
  "fal_key",
  "stripe_secret_key",
  "stripe_publishable_key",
  "stripe_webhook_secret",
] as const;

const ENV_MAP: Record<(typeof SECRET_KEYS)[number], string | undefined> = {
  gemini_api_key: process.env.GEMINI_API_KEY,
  dataforseo_login: process.env.DATAFORSEO_LOGIN,
  dataforseo_password: process.env.DATAFORSEO_PASSWORD,
  fal_key: process.env.FAL_KEY,
  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  stripe_publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
};

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export const Route = createFileRoute("/api/bootstrap-secrets")({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        if (process.env.NODE_ENV === "production") {
          return Response.json({ ok: false, message: "Not available in production." }, { status: 403 });
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
        const token = getBearerToken(request);
        if (!serviceRoleKey || token !== serviceRoleKey) {
          return Response.json({ ok: false, message: "Unauthorized." }, { status: 401 });
        }

        const url = process.env.VITE_SUPABASE_URL?.trim();

        if (!url || !serviceRoleKey) {
          return Response.json(
            {
              ok: false,
              message: "Add SUPABASE_SERVICE_ROLE_KEY to .env (Supabase Dashboard → API → service_role).",
            },
            { status: 503 },
          );
        }

        const entries = SECRET_KEYS.map((key) => ({
          key,
          value: ENV_MAP[key]?.trim() ?? "",
        })).filter((entry) => entry.value);

        if (entries.length === 0) {
          return Response.json(
            {
              ok: false,
              message: "No API keys in .env to bootstrap. Add them once, run this route, then remove them.",
            },
            { status: 400 },
          );
        }

        const supabase = createClient<Database>(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { error } = await supabase.from("app_secrets").upsert(entries);
        if (error) {
          return Response.json({ ok: false, message: error.message }, { status: 500 });
        }

        return Response.json({
          ok: true,
          message: `Stored ${entries.length} secrets in Supabase. Remove API keys from .env and restart the server.`,
          keys: entries.map((entry) => entry.key),
        });
      },
    },
  },
});
