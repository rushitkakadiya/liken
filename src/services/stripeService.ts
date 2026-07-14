import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { mapProfileToUser } from "@/services/profileService";
import type { DbProfile } from "@/types/database";
import { setUser } from "@/lib/auth";

export type StripePlanConfig = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  billingInterval: "month" | "year";
  priceLabel: string;
  productSuggestionsLimit: number;
  tryOnsLimit: number;
};

export type StripeConfigResponse =
  | {
      ok: true;
      publishableKey: string;
      plan: StripePlanConfig;
    }
  | {
      ok: false;
      message: string;
    };

async function getAccessToken() {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.access_token) {
    return sessionData.session.access_token;
  }

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error) return null;
  return refreshed.session?.access_token ?? null;
}

export async function fetchStripeConfig(): Promise<StripeConfigResponse> {
  const response = await fetch("/api/stripe-config");
  return (await response.json()) as StripeConfigResponse;
}

export async function startPremiumCheckout(): Promise<
  | { ok: true; checkoutUrl: string }
  | { ok: false; message: string }
> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      message: "Your session expired. Please sign in again.",
    };
  }

  const response = await fetch("/api/stripe-checkout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json()) as {
    ok: boolean;
    checkoutUrl?: string;
    message?: string;
  };

  if (!payload.ok || !payload.checkoutUrl) {
    return {
      ok: false,
      message: payload.message ?? "Could not start checkout.",
    };
  }

  return { ok: true, checkoutUrl: payload.checkoutUrl };
}

export async function verifyCheckoutSession(sessionId: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { ok: false as const, message: "Your session expired. Please sign in again." };
  }

  const maxAttempts = 4;
  let lastMessage = "Payment verification failed.";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch("/api/stripe-verify-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sessionId }),
    });

    const payload = (await response.json()) as {
      ok: boolean;
      profile?: DbProfile;
      message?: string;
      error?: string;
    };

    if (payload.ok && payload.profile) {
      setUser(mapProfileToUser(payload.profile));
      return { ok: true as const, profile: payload.profile };
    }

    lastMessage = payload.message ?? lastMessage;

    if (payload.error === "NOT_PAID" || payload.error === "MISSING_SUBSCRIPTION") {
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
    }

    break;
  }

  return {
    ok: false as const,
    message: lastMessage,
  };
}
