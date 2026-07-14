import { getSupabaseServiceClient } from "@/lib/supabaseService.server";
import type { DbSubscriptionPlan } from "@/types/database";

export const PREMIUM_PLAN_ID = "premium_monthly";

const FALLBACK_PREMIUM_PLAN: DbSubscriptionPlan = {
  id: PREMIUM_PLAN_ID,
  name: "Premium Monthly",
  price_cents: 1000,
  currency: "usd",
  billing_interval: "month",
  product_suggestions_limit: 15,
  try_ons_limit: 15,
  active: true,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

export async function getPremiumSubscriptionPlan(): Promise<DbSubscriptionPlan | null> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", PREMIUM_PLAN_ID)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      if (error.message.includes("Could not find the table")) {
        console.warn(
          "[subscription-plans] subscription_plans table missing — run supabase/migrations/007_stripe_billing.sql",
        );
        return FALLBACK_PREMIUM_PLAN;
      }
      console.error("[subscription-plans] Failed to load premium plan:", error.message);
      return null;
    }

    if (!data) return FALLBACK_PREMIUM_PLAN;

    // Normalize currency so Premium is always billed/displayed in USD.
    return {
      ...data,
      currency: "usd",
    };
  } catch (error) {
    console.error("[subscription-plans] Unavailable:", error);
    return FALLBACK_PREMIUM_PLAN;
  }
}

export function formatPlanPrice(plan: Pick<DbSubscriptionPlan, "price_cents" | "currency">) {
  const amount = plan.price_cents / 100;
  const currency = plan.currency.toUpperCase();

  if (currency === "USD") {
    return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: plan.currency,
  }).format(amount);
}
