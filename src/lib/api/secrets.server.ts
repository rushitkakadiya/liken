import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type AppSecretKey =
  | "gemini_api_key"
  | "dataforseo_login"
  | "dataforseo_password"
  | "fal_key"
  | "stripe_secret_key"
  | "stripe_publishable_key"
  | "stripe_webhook_secret";

const CACHE_TTL_MS = 5 * 60 * 1000;
const secretCache = new Map<AppSecretKey, { value: string; expiresAt: number }>();
let bootstrapAttempted = false;

const ENV_SECRET_MAP: Record<AppSecretKey, string> = {
  gemini_api_key: "GEMINI_API_KEY",
  dataforseo_login: "DATAFORSEO_LOGIN",
  dataforseo_password: "DATAFORSEO_PASSWORD",
  fal_key: "FAL_KEY",
  stripe_secret_key: "STRIPE_SECRET_KEY",
  stripe_publishable_key: "STRIPE_PUBLISHABLE_KEY",
  stripe_webhook_secret: "STRIPE_WEBHOOK_SECRET",
};

function getSupabaseServiceClient() {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required on the server to load API secrets from Supabase.",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function bootstrapSecretsFromEnvIfNeeded() {
  if (bootstrapAttempted) return;
  bootstrapAttempted = true;

  const entries = (Object.keys(ENV_SECRET_MAP) as AppSecretKey[])
    .map((key) => ({
      key,
      value: process.env[ENV_SECRET_MAP[key]]?.trim() ?? "",
    }))
    .filter((entry) => entry.value);

  if (entries.length === 0) return;

  try {
    const supabase = getSupabaseServiceClient();
    const { count, error: countError } = await supabase
      .from("app_secrets")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("[secrets] Bootstrap check failed:", countError.message);
      return;
    }

    if ((count ?? 0) > 0) return;

    const { error } = await supabase.from("app_secrets").upsert(entries);
    if (error) {
      console.error("[secrets] Bootstrap insert failed:", error.message);
      return;
    }

    console.log(`[secrets] Bootstrapped ${entries.length} API secrets into Supabase.`);
    clearAppSecretsCache();
  } catch (error) {
    console.error("[secrets] Bootstrap failed:", error);
  }
}

async function readSecretFromDb(key: AppSecretKey): Promise<string> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("app_secrets")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error(`[secrets] Failed to load ${key}:`, error.message);
    return "";
  }

  return data?.value?.trim() ?? "";
}

export async function getAppSecret(key: AppSecretKey): Promise<string> {
  const cached = secretCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const fromEnv = () => process.env[ENV_SECRET_MAP[key]]?.trim() ?? "";

  try {
    await bootstrapSecretsFromEnvIfNeeded();
    const value = (await readSecretFromDb(key)) || fromEnv();
    secretCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (error) {
    console.error(`[secrets] Unavailable for ${key}:`, error);
    const value = fromEnv();
    if (value) {
      secretCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return value;
  }
}

export function clearAppSecretsCache() {
  secretCache.clear();
}

export async function getGeminiApiKeyFromSecrets() {
  return getAppSecret("gemini_api_key");
}

export async function getDataForSeoCredentialsFromSecrets() {
  const login = await getAppSecret("dataforseo_login");
  const password = await getAppSecret("dataforseo_password");
  if (!login || !password) return null;
  return { login, password };
}

export async function getFalKeyFromSecrets() {
  return getAppSecret("fal_key");
}

export async function getStripeSecretKeyFromSecrets() {
  return getAppSecret("stripe_secret_key");
}

export async function getStripePublishableKeyFromSecrets() {
  return getAppSecret("stripe_publishable_key");
}
