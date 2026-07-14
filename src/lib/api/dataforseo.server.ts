import type {
  OutfitGarmentInput,
  ProductRecommendationsResponse,
  RecommendedProduct,
} from "@/types/productRecommendations";
import { getDataForSeoCredentialsFromSecrets } from "./secrets.server";

const SERP_LIVE_URL = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";

type ProductCategory = "top" | "bottom";

const PRODUCTS_PER_CATEGORY = 8;

/** Common ISO → DataForSEO Google location_code values. */
const LOCATION_CODES: Record<string, number> = {
  AU: 2036,
  US: 2840,
  GB: 2826,
  UK: 2826,
  CA: 2124,
  IN: 2356,
  NZ: 2554,
  DE: 2276,
  FR: 2250,
  IT: 2380,
  ES: 2724,
  NL: 2528,
  SE: 2752,
  NO: 2578,
  DK: 2208,
  IE: 2372,
  SG: 2702,
  AE: 2784,
  JP: 2392,
  KR: 2410,
  BR: 2076,
  MX: 2484,
  ZA: 2710,
  PH: 2608,
  MY: 2458,
  ID: 2360,
  TH: 2764,
  VN: 2704,
};

export class DataForSeoError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = "DataForSeoError";
    this.code = code;
  }
}

export function getDataForSeoUserMessage(error: unknown) {
  if (error instanceof DataForSeoError) {
    if (error.code === 40104) {
      return "DataForSEO account verification is required. Complete verification at https://app.dataforseo.com/ then try again.";
    }
    if (error.code === 40101 || error.code === 40102) {
      return "DataForSEO credentials are invalid. Check dataforseo_login and dataforseo_password in Supabase app_secrets.";
    }
    if (error.message) return error.message;
  }

  if (error instanceof Error) {
    if (error.message.includes("credentials are not configured")) {
      return "Product search is not configured. Add dataforseo_login and dataforseo_password to Supabase app_secrets.";
    }
    if (error.message.includes("timed out")) {
      return "Product search is taking longer than expected. Please try again.";
    }
  }

  return "Unable to fetch products right now. Please try again.";
}

function basicAuthHeader(login: string, password: string) {
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

function assertDataForSeoOk(payload: {
  status_code?: number;
  status_message?: string;
}) {
  if (payload.status_code == null || payload.status_code === 20000) return;
  throw new DataForSeoError(
    payload.status_code,
    payload.status_message || "DataForSEO request failed",
  );
}

export function buildSearchKeyword(gender: string, garment: OutfitGarmentInput) {
  return `${gender} ${garment.colorName} ${garment.type}`.replace(/\s+/g, " ").trim();
}

function formatPrice(price: unknown, currency?: string) {
  if (price == null || price === "") return "";
  if (typeof price === "object" && price !== null) {
    const record = price as Record<string, unknown>;
    if (typeof record.displayed_price === "string" && record.displayed_price.trim()) {
      return record.displayed_price.trim();
    }
    const current = record.current;
    const curr =
      (typeof record.currency === "string" && record.currency) || currency || "";
    if (typeof current === "number") {
      try {
        return new Intl.NumberFormat(undefined, {
          style: curr ? "currency" : "decimal",
          currency: curr || undefined,
          maximumFractionDigits: 2,
        }).format(current);
      } catch {
        return curr ? `${curr} ${current}` : String(current);
      }
    }
  }

  const numeric = typeof price === "number" ? price : Number(price);
  if (Number.isNaN(numeric)) return String(price);
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(numeric);
    } catch {
      return `${currency} ${numeric.toFixed(2)}`;
    }
  }
  return numeric.toFixed(2);
}

function shoppingSearchUrl(title: string, seller: string, countryCode: string) {
  const q = encodeURIComponent([title, seller].filter(Boolean).join(" "));
  const gl = countryCode.toLowerCase();
  return `https://www.google.com/search?tbm=shop&q=${q}&gl=${gl}`;
}

function uniqueGarments(garments: OutfitGarmentInput[]) {
  const map = new Map<string, OutfitGarmentInput>();
  for (const garment of garments) {
    const key = `${garment.colorName}|${garment.hex}|${garment.type}`;
    if (!map.has(key)) map.set(key, garment);
  }
  return [...map.values()];
}

function dedupeKey(product: RecommendedProduct) {
  return `${product.title}|${product.store}|${product.url}`.toLowerCase();
}

function mergeProducts(lists: RecommendedProduct[][], max: number) {
  const seen = new Set<string>();
  const merged: RecommendedProduct[] = [];
  for (const list of lists) {
    for (const product of list) {
      const key = dedupeKey(product);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(product);
      if (merged.length >= max) return merged;
    }
  }
  return merged;
}

type LiveSerpItem = Record<string, unknown>;

function collectProductsFromLiveSerp(
  items: unknown[],
  input: {
    category: ProductCategory;
    garment: OutfitGarmentInput;
    query: string;
    countryName: string;
    countryCode: string;
  },
  limit: number,
): RecommendedProduct[] {
  const products: RecommendedProduct[] = [];
  const seen = new Set<string>();

  const push = (raw: {
    title: string;
    image?: string;
    price?: unknown;
    currency?: string;
    store?: string;
    url?: string;
    rating?: number | null;
    reviewsCount?: number | null;
  }) => {
    if (products.length >= limit) return;
    const title = raw.title.trim();
    if (!title) return;
    const store = (raw.store || "Store").trim() || "Store";
    const image = (raw.image || "").trim();
    const url =
      (raw.url && raw.url.startsWith("http") ? raw.url : "") ||
      shoppingSearchUrl(title, store, input.countryCode);
    const key = `${title}|${store}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const currency =
      raw.currency ||
      (typeof raw.price === "object" &&
      raw.price &&
      typeof (raw.price as { currency?: string }).currency === "string"
        ? (raw.price as { currency: string }).currency
        : "");

    products.push({
      id: `${input.category}-${crypto.randomUUID()}`,
      category: input.category,
      title,
      image,
      price: formatPrice(raw.price, currency),
      currency,
      store,
      url,
      rating: raw.rating ?? null,
      reviewsCount: raw.reviewsCount ?? null,
      country: input.countryName,
      matchedColorName: input.garment.colorName,
      matchedHex: input.garment.hex,
      query: input.query,
    });
  };

  // 1) Prefer Google "Popular products" cards — include images + price.
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const block = item as LiveSerpItem;
    if (block.type !== "popular_products" || !Array.isArray(block.items)) continue;

    for (const child of block.items) {
      if (!child || typeof child !== "object") continue;
      const el = child as LiveSerpItem;
      if (typeof el.title !== "string") continue;
      const ratingObj =
        el.rating && typeof el.rating === "object"
          ? (el.rating as Record<string, unknown>)
          : null;
      push({
        title: el.title,
        image: typeof el.image_url === "string" ? el.image_url : undefined,
        price: el.price,
        store: typeof el.seller === "string" ? el.seller : undefined,
        rating:
          ratingObj && typeof ratingObj.value === "number" ? ratingObj.value : null,
        reviewsCount:
          ratingObj && typeof ratingObj.votes_count === "number"
            ? ratingObj.votes_count
            : null,
      });
    }
  }

  // 2) Fallback: organic results with direct shop links.
  if (products.length < Math.min(3, limit)) {
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const el = item as LiveSerpItem;
      if (el.type !== "organic" || typeof el.title !== "string") continue;
      if (typeof el.url !== "string" || !el.url.startsWith("http")) continue;

      const images = Array.isArray(el.images) ? el.images : [];
      const image =
        typeof images[0] === "string"
          ? images[0]
          : images[0] && typeof images[0] === "object" &&
              typeof (images[0] as { image?: string }).image === "string"
            ? (images[0] as { image: string }).image
            : "";

      push({
        title: el.title,
        image,
        price: el.price,
        store:
          (typeof el.website_name === "string" && el.website_name) ||
          (typeof el.domain === "string" && el.domain) ||
          undefined,
        url: el.url,
      });
    }
  }

  return products;
}

async function searchLiveProducts(input: {
  authHeader: string;
  countryName: string;
  countryCode: string;
  category: ProductCategory;
  garment: OutfitGarmentInput;
  keyword: string;
}): Promise<RecommendedProduct[]> {
  const locationCode = LOCATION_CODES[input.countryCode.toUpperCase()];
  const payloadBody = [
    {
      language_name: "English",
      keyword: `${input.keyword} buy`,
      depth: 20,
      ...(locationCode
        ? { location_code: locationCode }
        : { location_name: input.countryName }),
    },
  ];

  const response = await fetch(SERP_LIVE_URL, {
    method: "POST",
    headers: {
      Authorization: input.authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payloadBody),
  });

  const payload = await response.json();
  assertDataForSeoOk(payload);

  const task = payload?.tasks?.[0];
  if (task?.status_code && task.status_code !== 20000) {
    throw new DataForSeoError(
      task.status_code,
      task.status_message || "DataForSEO live search failed",
    );
  }

  const items = task?.result?.[0]?.items;
  if (!Array.isArray(items)) return [];

  return collectProductsFromLiveSerp(
    items,
    {
      category: input.category,
      garment: input.garment,
      query: input.keyword,
      countryName: input.countryName,
      countryCode: input.countryCode,
    },
    PRODUCTS_PER_CATEGORY,
  );
}

export async function fetchProductRecommendations(input: {
  countryName: string;
  countryCode: string;
  gender: string;
  looks: Array<{
    top: OutfitGarmentInput;
    bottom: OutfitGarmentInput;
  }>;
}): Promise<ProductRecommendationsResponse> {
  const credentials = await getDataForSeoCredentialsFromSecrets();
  if (!credentials) {
    throw new Error("DataForSEO credentials are not configured");
  }

  const authHeader = basicAuthHeader(credentials.login, credentials.password);
  const tops = uniqueGarments(input.looks.map((look) => look.top)).slice(0, 1);
  const bottoms = uniqueGarments(input.looks.map((look) => look.bottom)).slice(0, 1);

  const tasks = [
    ...tops.map((garment) => ({
      category: "top" as const,
      garment,
      keyword: buildSearchKeyword(input.gender, garment),
    })),
    ...bottoms.map((garment) => ({
      category: "bottom" as const,
      garment,
      keyword: buildSearchKeyword(input.gender, garment),
    })),
  ];

  console.info(
    "[product-recommendations] live serp search",
    tasks.map((task) => ({ category: task.category, keyword: task.keyword })),
  );

  const settled = await Promise.allSettled(
    tasks.map((task) =>
      searchLiveProducts({
        authHeader,
        countryName: input.countryName,
        countryCode: input.countryCode,
        category: task.category,
        garment: task.garment,
        keyword: task.keyword,
      }),
    ),
  );

  const topLists: RecommendedProduct[][] = [];
  const bottomLists: RecommendedProduct[][] = [];
  const failures: unknown[] = [];

  settled.forEach((result, index) => {
    const meta = tasks[index]!;
    if (result.status === "rejected") {
      failures.push(result.reason);
      console.error("[product-recommendations] live search failed", meta.keyword, result.reason);
      return;
    }

    console.info(
      "[product-recommendations] products",
      meta.category,
      result.value.length,
      "from",
      meta.keyword,
    );

    if (meta.category === "top") topLists.push(result.value);
    else bottomLists.push(result.value);
  });

  const top = mergeProducts(topLists, PRODUCTS_PER_CATEGORY);
  const bottom = mergeProducts(bottomLists, PRODUCTS_PER_CATEGORY);

  if (top.length === 0 && bottom.length === 0) {
    if (failures[0]) throw failures[0];
    return { ok: true, products: { top: [], bottom: [] } };
  }

  return {
    ok: true,
    products: { top, bottom },
  };
}
