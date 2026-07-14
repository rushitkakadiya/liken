import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getUser, isPremium, setUser } from "@/lib/auth";
import type { Product } from "./productRecommendationService";
import type { TryOnResponse } from "@/types/tryOn";
import { PREMIUM_MONTHLY_LIMIT } from "@/types/database";

export type TryOnInput = {
  userImage: string;
  product: Product;
};

export type TryOnResult = {
  generatedImageUrl: string;
  requestId: string;
  remainingTryOns: number;
};

async function getAccessToken() {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.access_token) {
    return sessionData.session.access_token;
  }
  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? null;
}

export function getRemainingTryOns() {
  const user = getUser();
  if (!isPremium(user)) return 0;
  return Math.max(0, PREMIUM_MONTHLY_LIMIT - (user?.tryOnsUsed ?? 0));
}

export function checkTryOnAllowed() {
  const user = getUser();
  if (!isPremium(user)) {
    return {
      ok: false as const,
      message: "Upgrade to Premium to use AI virtual try-on.",
    };
  }

  const remaining = getRemainingTryOns();
  if (remaining <= 0) {
    return {
      ok: false as const,
      message: `You have used all ${PREMIUM_MONTHLY_LIMIT} AI try-ons for this subscription month.`,
    };
  }
  return { ok: true as const, remaining };
}

export async function generateTryOn(input: TryOnInput): Promise<TryOnResult> {
  const allowed = checkTryOnAllowed();
  if (!allowed.ok) {
    throw new Error(allowed.message);
  }

  if (!input.userImage) {
    throw new Error("Upload a clear photo before generating a try-on preview.");
  }

  if (!input.product.image) {
    throw new Error("This product does not include an image for try-on.");
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const response = await fetch("/api/try-on", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      userImageUrl: input.userImage,
      productImageUrl: input.product.image,
      productTitle: input.product.title,
      category: input.product.category,
      matchedColorName: input.product.matchedColorName,
      matchedHex: input.product.matchedHex,
    }),
  });

  const payload = (await response.json()) as TryOnResponse;

  if (!payload.success) {
    throw new Error(payload.message);
  }

  const current = getUser();
  if (current) {
    const used = PREMIUM_MONTHLY_LIMIT - payload.remainingTryOns;
    setUser({
      ...current,
      tryOnsUsed: used,
    });
  }

  return {
    generatedImageUrl: payload.generatedImageUrl,
    requestId: payload.requestId,
    remainingTryOns: payload.remainingTryOns,
  };
}
