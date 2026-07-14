export type OutfitGarmentInput = {
  type: string;
  colorName: string;
  hex: string;
};

export type OutfitInput = {
  top: OutfitGarmentInput;
  bottom: OutfitGarmentInput;
};

export type ProductRecommendationRequest = {
  countryName: string;
  countryCode: string;
  gender: string;
  looks: OutfitInput[];
};

export type RecommendedProduct = {
  id: string;
  category: "top" | "bottom";
  title: string;
  image: string;
  price: string;
  currency: string;
  store: string;
  url: string;
  rating: number | null;
  reviewsCount: number | null;
  country: string;
  matchedColorName: string;
  matchedHex: string;
  query: string;
};

export type ProductRecommendationsResponse = {
  ok: true;
  products: {
    top: RecommendedProduct[];
    bottom: RecommendedProduct[];
  };
  remainingProductSuggestions?: number;
  profile?: {
    product_suggestions_used: number;
    try_ons_used: number;
    credits: number;
    looks_generated: number;
    plan: "Free" | "Premium";
    premium_expires_at: string | null;
  };
  cached?: boolean;
};

export type ProductRecommendationsErrorResponse = {
  ok: false;
  error:
    | "PREMIUM_REQUIRED"
    | "INVALID_REQUEST"
    | "FETCH_FAILED"
    | "UNAUTHORIZED"
    | "PRODUCT_LIMIT_REACHED";
  message: string;
};

export type ProductRecommendationsResult =
  | ProductRecommendationsResponse
  | ProductRecommendationsErrorResponse;
