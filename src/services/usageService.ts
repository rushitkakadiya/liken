import type { User } from "@/lib/auth";
import { setUser } from "@/lib/auth";
import { mapProfileToUser } from "@/services/profileService";
import type { DbProfile } from "@/types/database";
import { PREMIUM_MONTHLY_LIMIT } from "@/types/database";
import { getSupabase } from "@/lib/supabaseClient";

export { PREMIUM_MONTHLY_LIMIT };

function applyProfile(profile: DbProfile): User {
  const user = mapProfileToUser(profile);
  setUser(user);
  return user;
}

function rpcErrorMessage(error: { message?: string; code?: string } | null, fallback: string) {
  const message = error?.message ?? "";
  if (message.includes("PREMIUM_REQUIRED")) return "Upgrade to Premium to use this feature.";
  if (message.includes("PRODUCT_LIMIT_REACHED")) {
    return `You have used all ${PREMIUM_MONTHLY_LIMIT} product suggestions for this subscription month.`;
  }
  if (message.includes("TRYON_LIMIT_REACHED")) {
    return `You have used all ${PREMIUM_MONTHLY_LIMIT} AI try-ons for this subscription month.`;
  }
  if (message.includes("UNAUTHORIZED")) return "Your session expired. Please sign in again.";
  return fallback;
}

export async function activatePremiumSubscription(): Promise<User> {
  throw new Error("Premium is activated through Stripe checkout. Go to Pricing to subscribe.");
}

export async function recordLookGenerated(): Promise<User> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("record_look_generated");
  if (error || !data) {
    throw new Error(rpcErrorMessage(error, "Could not update generation usage."));
  }
  return applyProfile(data as DbProfile);
}

export async function consumeProductSuggestionUsage(): Promise<User> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("consume_product_suggestion");
  if (error || !data) {
    throw new Error(rpcErrorMessage(error, "Could not load product suggestions."));
  }
  return applyProfile(data as DbProfile);
}

export async function consumeTryOnUsage(): Promise<User> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("consume_try_on");
  if (error || !data) {
    throw new Error(rpcErrorMessage(error, "Could not start AI try-on."));
  }
  return applyProfile(data as DbProfile);
}

export function getRemainingProductSuggestions(user: User | null) {
  if (!user) return 0;
  return Math.max(0, PREMIUM_MONTHLY_LIMIT - (user.productSuggestionsUsed ?? 0));
}

export function getRemainingTryOnsFromUser(user: User | null) {
  if (!user) return 0;
  return Math.max(0, PREMIUM_MONTHLY_LIMIT - (user.tryOnsUsed ?? 0));
}
