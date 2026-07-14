import type { ProductRecommendationsResponse } from "@/types/productRecommendations";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  data: ProductRecommendationsResponse;
};

const cache = new Map<string, CacheEntry>();

export function buildProductCacheKey(input: {
  countryCode: string;
  gender: string;
  looks: Array<{
    top: { colorName: string; type: string; hex: string };
    bottom: { colorName: string; type: string; hex: string };
  }>;
}) {
  const { countryCode, gender, looks } = input;
  const variantKeys = looks
    .flatMap((look) => [
      `top:${look.top.colorName}:${look.top.type}:${look.top.hex}`,
      `bottom:${look.bottom.colorName}:${look.bottom.type}:${look.bottom.hex}`,
    ])
    .sort()
    .join(";");

  return [countryCode, gender, variantKeys].join("|");
}

export function getCachedProductRecommendations(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return { ...entry.data, cached: true };
}

export function setCachedProductRecommendations(
  key: string,
  data: ProductRecommendationsResponse,
) {
  cache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: { ...data, cached: false },
  });
}
