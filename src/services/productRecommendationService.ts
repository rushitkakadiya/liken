import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getUser, setUser } from "@/lib/auth";
import type { Look } from "@/lib/auth";
import type {
  OutfitInput,
  ProductRecommendationsResult,
  RecommendedProduct,
} from "@/types/productRecommendations";

export type Product = RecommendedProduct;

export type ProductGroups = {
  top: RecommendedProduct[];
  bottom: RecommendedProduct[];
};

export type FetchProductRecommendationsInput = {
  countryName: string;
  countryCode: string;
  gender: string;
  looks: OutfitInput[];
};

export function lookToOutfitInput(look: Look): OutfitInput {
  return {
    top: {
      type: look.top,
      colorName: look.topColorName ?? look.top,
      hex: look.topColor,
    },
    bottom: {
      type: look.bottom,
      colorName: look.bottomColorName ?? look.bottom,
      hex: look.bottomColor,
    },
  };
}

export function looksToOutfitInputs(looks: Look[]): OutfitInput[] {
  return looks.map(lookToOutfitInput);
}

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

function applyUsageProfile(profile: {
  product_suggestions_used: number;
  try_ons_used: number;
  credits: number;
  looks_generated: number;
  plan: "Free" | "Premium";
  premium_expires_at: string | null;
}) {
  const current = getUser();
  if (!current) return;
  setUser({
    ...current,
    credits: profile.credits,
    plan: profile.plan,
    looksGenerated: profile.looks_generated,
    productSuggestionsUsed: profile.product_suggestions_used,
    tryOnsUsed: profile.try_ons_used,
    premiumExpiresAt: profile.premium_expires_at ?? undefined,
  });
}

export async function fetchProductRecommendations(
  input: FetchProductRecommendationsInput,
): Promise<ProductRecommendationsResult> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return {
      ok: false,
      error: "UNAUTHORIZED",
      message: "Your session expired. Please sign out and sign in again, then try Show Matching Products.",
    };
  }

  const response = await fetch("/api/product-recommendations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  let payload: ProductRecommendationsResult;
  try {
    payload = (await response.json()) as ProductRecommendationsResult;
  } catch {
    return {
      ok: false,
      error: "FETCH_FAILED",
      message:
        response.status === 504 || response.status === 408
          ? "Product search is taking longer than expected. Please try again."
          : "Unable to fetch products right now. Please try again.",
    };
  }

  if (payload.ok && payload.profile) {
    applyUsageProfile(payload.profile);
  }

  if (!payload.ok && payload.error === "UNAUTHORIZED") {
    return {
      ok: false,
      error: "UNAUTHORIZED",
      message: "Your session expired. Please sign out and sign in again, then try Show Matching Products.",
    };
  }

  return payload;
}

export function hasAnyProducts(products: ProductGroups | null) {
  if (!products) return false;
  return products.top.length + products.bottom.length > 0;
}
