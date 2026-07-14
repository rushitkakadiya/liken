import type {
  OutfitGarmentInput,
  ProductRecommendationsResponse,
  RecommendedProduct,
} from "@/types/productRecommendations";
import { getDataForSeoCredentialsFromSecrets } from "./secrets.server";

const SERP_LIVE_URL = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";

type ProductCategory = "top" | "bottom";

const PRODUCTS_PER_CATEGORY = 9;
const MAX_COLOR_VARIANTS = 3;
const PRODUCTS_PER_VARIANT = 6;

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

function mergeProductsRoundRobin(lists: RecommendedProduct[][], max: number) {
  const seen = new Set<string>();
  const merged: RecommendedProduct[] = [];
  let index = 0;
  let progressed = true;

  while (merged.length < max && progressed) {
    progressed = false;
    for (const list of lists) {
      if (merged.length >= max) break;
      const product = list[index];
      if (!product) continue;
      const key = dedupeKey(product);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(product);
      progressed = true;
    }
    index += 1;
  }

  return merged;
}

type LiveSerpItem = Record<string, unknown>;

function hasUsableProductImage(image?: string) {
  if (!image) return false;
  try {
    const url = new URL(image);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extractUsablePrice(price: unknown): { display: string; currency: string } | null {
  if (price == null || price === "") return null;

  if (typeof price === "object") {
    const record = price as Record<string, unknown>;
    const current = record.current;
    const currency = typeof record.currency === "string" ? record.currency : "";
    const displayed =
      typeof record.displayed_price === "string" ? record.displayed_price.trim() : "";

    if (typeof current !== "number" || !Number.isFinite(current) || current <= 0) {
      return null;
    }

    if (/free delivery|delivery over|shipping/i.test(displayed)) {
      return null;
    }

    return {
      display: formatPrice(price, currency) || (currency ? `${currency} ${current}` : String(current)),
      currency,
    };
  }

  const numeric = Number(price);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return { display: formatPrice(numeric), currency: "" };
}

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
    store?: string;
    url?: string;
    rating?: number | null;
    reviewsCount?: number | null;
  }) => {
    if (products.length >= limit) return;

    const title = raw.title.trim();
    if (!title) return;
    if (/^buy\b|online australia|shop (all|men|women)|collection/i.test(title)) return;

    const image = (raw.image || "").trim();
    if (!hasUsableProductImage(image)) return;

    const priced = extractUsablePrice(raw.price);
    if (!priced) return;

    const store = (raw.store || "Store").trim() || "Store";
    const url =
      (raw.url && raw.url.startsWith("http") ? raw.url : "") ||
      shoppingSearchUrl(title, store, input.countryCode);
    const key = `${title}|${store}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    products.push({
      id: `${input.category}-${crypto.randomUUID()}`,
      category: input.category,
      title,
      image,
      price: priced.display,
      currency: priced.currency,
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

  // Only Google "Popular products" cards — real image + price.
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

  return products;
}

async function runSerpLiveSearch(input: {
  authHeader: string;
  countryName: string;
  countryCode: string;
  keyword: string;
}) {
  const locationCode = LOCATION_CODES[input.countryCode.toUpperCase()];
  const payloadBody = [
    {
      language_name: "English",
      keyword: input.keyword,
      depth: 40,
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

  return Array.isArray(task?.result?.[0]?.items) ? (task.result[0].items as unknown[]) : [];
}

async function searchLiveProducts(input: {
  authHeader: string;
  countryName: string;
  countryCode: string;
  category: ProductCategory;
  garment: OutfitGarmentInput;
  keyword: string;
}): Promise<RecommendedProduct[]> {
  const queries = [
    `${input.keyword} buy`,
    `${input.garment.colorName} ${input.garment.type}`.replace(/\s+/g, " ").trim(),
  ];

  const collected: RecommendedProduct[][] = [];

  for (const query of queries) {
    try {
      const items = await runSerpLiveSearch({
        authHeader: input.authHeader,
        countryName: input.countryName,
        countryCode: input.countryCode,
        keyword: query,
      });
      collected.push(
        collectProductsFromLiveSerp(
          items,
          {
            category: input.category,
            garment: input.garment,
            query: input.keyword,
            countryName: input.countryName,
            countryCode: input.countryCode,
          },
          PRODUCTS_PER_VARIANT,
        ),
      );
    } catch (error) {
      console.error("[product-recommendations] query failed", query, error);
    }

    const soFar = mergeProductsRoundRobin(collected, PRODUCTS_PER_VARIANT);
    if (soFar.length >= PRODUCTS_PER_VARIANT) return soFar;
  }

  return mergeProductsRoundRobin(collected, PRODUCTS_PER_VARIANT);
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

  const tops = uniqueGarments(input.looks.map((look) => look.top)).slice(0, MAX_COLOR_VARIANTS);
  const bottoms = uniqueGarments(input.looks.map((look) => look.bottom)).slice(0, MAX_COLOR_VARIANTS);

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

    // Keep only complete product cards before merging.
    const usable = result.value.filter(
      (product) => hasUsableProductImage(product.image) && Boolean(product.price?.trim()),
    );

    console.info(
      "[product-recommendations] products",
      meta.category,
      usable.length,
      "from",
      meta.keyword,
    );

    if (meta.category === "top") topLists.push(usable);
    else bottomLists.push(usable);
  });

  const top = mergeProductsRoundRobin(topLists, PRODUCTS_PER_CATEGORY);
  const bottom = mergeProductsRoundRobin(bottomLists, PRODUCTS_PER_CATEGORY);

  if (top.length === 0 && bottom.length === 0) {
    if (failures[0]) throw failures[0];
    return { ok: true, products: { top: [], bottom: [] } };
  }

  return {
    ok: true,
    products: { top, bottom },
  };
}
