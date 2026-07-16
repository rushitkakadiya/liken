import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getUser, isPremium, setUser } from "@/lib/auth";
import type { Product } from "./productRecommendationService";
import type { TryOnResponse } from "@/types/tryOn";
import { PREMIUM_MONTHLY_LIMIT } from "@/types/database";
import { compressDataUrlForTryOn } from "./colorAnalysisMappers";

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

function normalizeCategory(category: unknown): "top" | "bottom" {
  return category === "bottom" ? "bottom" : "top";
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

  // Large phone photos crash Safari's response.json() with
  // "The string did not match the expected pattern" when the API returns an HTML error page.
  const userImageUrl = await compressDataUrlForTryOn(input.userImage);

  let response: Response;
  try {
    response = await fetch("/api/try-on", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        userImageUrl,
        productImageUrl: input.product.image,
        productTitle: input.product.title || "Product",
        category: normalizeCategory(input.product.category),
        matchedColorName: input.product.matchedColorName || "Color",
        matchedHex: input.product.matchedHex || "#888888",
      }),
    });
  } catch {
    throw new Error("Could not reach the try-on service. Please check your connection and try again.");
  }

  const rawText = await response.text();
  let payload: TryOnResponse;
  try {
    payload = JSON.parse(rawText) as TryOnResponse;
  } catch {
    // Safari surfaces non-JSON bodies as "The string did not match the expected pattern".
    throw new Error(
      response.status >= 500
        ? "Try-on service is temporarily unavailable. Please try again in a moment."
        : "Unable to generate your try-on preview right now. Try a clearer photo or another product.",
    );
  }

  if (!payload.success) {
    throw new Error(payload.message || "Unable to generate your try-on preview right now.");
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
