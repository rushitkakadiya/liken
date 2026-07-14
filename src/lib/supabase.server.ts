import { createClient } from "@supabase/supabase-js";
import type { Database, DbProfile } from "@/types/database";
import { PREMIUM_MONTHLY_LIMIT } from "@/types/database";

export function getSupabaseServerClient(accessToken?: string) {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase is not configured on the server.");
  }

  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

function isActivePremiumProfile(profile: Pick<DbProfile, "plan" | "premium_expires_at">) {
  if (profile.plan !== "Premium" || !profile.premium_expires_at) return false;
  return new Date(profile.premium_expires_at).getTime() > Date.now();
}

export async function verifyAuthenticatedUser(accessToken: string | null) {
  if (!accessToken) {
    return { ok: false as const, error: "UNAUTHORIZED" as const };
  }

  try {
    const supabase = getSupabaseServerClient(accessToken);
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return { ok: false as const, error: "UNAUTHORIZED" as const };
    }

    return { ok: true as const, userId: data.user.id, supabase };
  } catch {
    return { ok: false as const, error: "UNAUTHORIZED" as const };
  }
}

export async function verifyPremiumUser(accessToken: string | null) {
  if (!accessToken) {
    return { ok: false as const, error: "UNAUTHORIZED" as const };
  }

  try {
    const supabase = getSupabaseServerClient(accessToken);
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return { ok: false as const, error: "UNAUTHORIZED" as const };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan, premium_expires_at, product_suggestions_used, try_ons_used")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return { ok: false as const, error: "UNAUTHORIZED" as const };
    }

    if (!isActivePremiumProfile(profile)) {
      return { ok: false as const, error: "PREMIUM_REQUIRED" as const };
    }

    return {
      ok: true as const,
      userId: data.user.id,
      supabase,
      profile,
    };
  } catch {
    return { ok: false as const, error: "UNAUTHORIZED" as const };
  }
}

export async function assertCanGenerateLook(accessToken: string) {
  const auth = await verifyAuthenticatedUser(accessToken);
  if (!auth.ok) return auth;
  return { ok: true as const, supabase: auth.supabase };
}

export async function recordLookGeneratedOnServer(accessToken: string) {
  const supabase = getSupabaseServerClient(accessToken);
  const { data, error } = await supabase.rpc("record_look_generated");
  if (error || !data) {
    return { ok: false as const, error: "UNAUTHORIZED" as const };
  }
  return { ok: true as const, profile: data as DbProfile };
}

export async function consumeProductSuggestionOnServer(accessToken: string) {
  const premium = await verifyPremiumUser(accessToken);
  if (!premium.ok) return premium;

  if (premium.profile.product_suggestions_used >= PREMIUM_MONTHLY_LIMIT) {
    return { ok: false as const, error: "PRODUCT_LIMIT_REACHED" as const };
  }

  const { data, error } = await premium.supabase.rpc("consume_product_suggestion");
  if (error || !data) {
    const message = error?.message ?? "";
    if (message.includes("PRODUCT_LIMIT_REACHED")) {
      return { ok: false as const, error: "PRODUCT_LIMIT_REACHED" as const };
    }
    if (message.includes("PREMIUM_REQUIRED")) {
      return { ok: false as const, error: "PREMIUM_REQUIRED" as const };
    }
    return { ok: false as const, error: "UNAUTHORIZED" as const };
  }

  return { ok: true as const, profile: data as DbProfile };
}

export async function consumeTryOnOnServer(accessToken: string) {
  const premium = await verifyPremiumUser(accessToken);
  if (!premium.ok) return premium;

  if (premium.profile.try_ons_used >= PREMIUM_MONTHLY_LIMIT) {
    return { ok: false as const, error: "TRYON_LIMIT_REACHED" as const };
  }

  const { data, error } = await premium.supabase.rpc("consume_try_on");
  if (error || !data) {
    const message = error?.message ?? "";
    if (message.includes("TRYON_LIMIT_REACHED")) {
      return { ok: false as const, error: "TRYON_LIMIT_REACHED" as const };
    }
    if (message.includes("PREMIUM_REQUIRED")) {
      return { ok: false as const, error: "PREMIUM_REQUIRED" as const };
    }
    return { ok: false as const, error: "UNAUTHORIZED" as const };
  }

  return { ok: true as const, profile: data as DbProfile };
}
