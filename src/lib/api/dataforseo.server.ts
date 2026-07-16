import type {
  OutfitGarmentInput,
  ProductRecommendationsResponse,
  RecommendedProduct,
} from "@/types/productRecommendations";
import { getDataForSeoCredentialsFromSecrets } from "./secrets.server";

const TASK_POST_URL = "https://api.dataforseo.com/v3/merchant/google/products/task_post";
const TASK_GET_URL = "https://api.dataforseo.com/v3/merchant/google/products/task_get/advanced";

type ProductCategory = "top" | "bottom";

const PRODUCTS_PER_CATEGORY = 9;
const MAX_COLOR_VARIANTS = 3;
const PRODUCTS_PER_VARIANT = 8;

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

const LOCALE_BY_COUNTRY: Record<string, string> = {
  AU: "en-AU",
  US: "en-US",
  GB: "en-GB",
  UK: "en-GB",
  CA: "en-CA",
  IN: "en-IN",
  NZ: "en-NZ",
  IE: "en-IE",
  SG: "en-SG",
};

const PENDING_TASK_STATUS_CODES = new Set([20100, 40601, 40602]);

type CategoryTask = {
  category: ProductCategory;
  keyword: string;
  garment: OutfitGarmentInput;
};

type UrlCandidates = {
  directUrl?: string;
  shoppingUrl?: string;
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

function isPendingTaskStatus(statusCode?: number) {
  return statusCode != null && PENDING_TASK_STATUS_CODES.has(statusCode);
}

function isTaskFailureStatus(statusCode?: number) {
  if (statusCode == null || statusCode === 20000) return false;
  if (isPendingTaskStatus(statusCode)) return false;
  return statusCode >= 40000;
}

function assertDataForSeoOk(payload: {
  status_code?: number;
  status_message?: string;
}) {
  if (payload.status_code == null || payload.status_code === 20000) return;
  if (isPendingTaskStatus(payload.status_code)) return;
  throw new DataForSeoError(
    payload.status_code,
    payload.status_message || "DataForSEO request failed",
  );
}

export function buildSearchKeyword(gender: string, garment: OutfitGarmentInput) {
  return `${gender} ${garment.colorName} ${garment.type}`.replace(/\s+/g, " ").trim();
}

function formatMoney(amount: number, currency: string, countryCode = "US") {
  const locale = LOCALE_BY_COUNTRY[countryCode.toUpperCase()] || "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function extractUsablePrice(
  raw: Record<string, unknown>,
  countryCode: string,
): { display: string; currency: string } | null {
  // Merchant API: price is a number + currency string.
  if (typeof raw.price === "number" && Number.isFinite(raw.price) && raw.price > 0) {
    const currency =
      (typeof raw.currency === "string" && raw.currency.trim()) || "USD";
    return { display: formatMoney(raw.price, currency, countryCode), currency };
  }

  // Some payloads nest price as { current, currency }.
  if (raw.price && typeof raw.price === "object") {
    const record = raw.price as Record<string, unknown>;
    const current = record.current;
    const currency =
      (typeof record.currency === "string" && record.currency.trim()) ||
      (typeof raw.currency === "string" && raw.currency.trim()) ||
      "USD";
    if (typeof current === "number" && Number.isFinite(current) && current > 0) {
      return { display: formatMoney(current, currency, countryCode), currency };
    }
  }

  return null;
}

function cleanStoreName(store: string) {
  return store.replace(/\s*&\s*more\s*$/i, "").trim() || "Store";
}

function cleanProductTitle(title: string) {
  return title
    .replace(/\s*-\s*Size\s*[A-Z0-9/]+\s*$/i, "")
    .replace(/\s*\(\s*Button Down Collar\s*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function firstHttpUrl(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const value = candidate.trim();
    if (!value) continue;
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return value;
    } catch {
      // ignore
    }
  }
  return undefined;
}

/** True product page on Google Shopping (gid/catalogid) — not a generic similar-products search. */
function isSpecificProductShoppingUrl(url?: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("google.")) return false;
    const q = parsed.searchParams.get("q") || "";
    const prds = parsed.searchParams.get("prds") || "";
    const hasProductId =
      parsed.searchParams.get("ibp") === "oshop" ||
      /gid:|gpcid:|catalogid:|headlineOfferDocid:|PC_/i.test(`${q} ${prds}`);
    return hasProductId;
  } catch {
    return false;
  }
}

function isGenericGoogleSearch(url?: string) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("google.")) return false;
    // Generic shopping search (udm=28 / tbm=shop without product ids).
    if (isSpecificProductShoppingUrl(url)) return false;
    return (
      parsed.searchParams.has("udm") ||
      parsed.searchParams.get("tbm") === "shop" ||
      parsed.pathname.includes("/search")
    );
  } catch {
    return true;
  }
}

function isDirectMerchantUrl(url?: string) {
  if (!url || !url.startsWith("http")) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !host.includes("google.");
  } catch {
    return false;
  }
}

function extractUrlCandidates(raw: Record<string, unknown>): UrlCandidates {
  return {
    directUrl: firstHttpUrl(raw.url),
    shoppingUrl: firstHttpUrl(raw.shopping_url),
  };
}

/** Prefer seller site; else the specific Google product page — never similar-product search. */
function resolveProductUrl(candidates: UrlCandidates): string | null {
  if (isDirectMerchantUrl(candidates.directUrl)) return candidates.directUrl!;
  if (isSpecificProductShoppingUrl(candidates.shoppingUrl)) return candidates.shoppingUrl!;
  return null;
}

function pickHdImage(raw: Record<string, unknown>): string | undefined {
  const images = Array.isArray(raw.product_images) ? raw.product_images : [];
  const urls = [
    ...images,
    raw.image_url,
    raw.image,
  ]
    .flatMap((c) => (Array.isArray(c) ? c : [c]))
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter(Boolean)
    .filter((url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    });

  if (!urls.length) return undefined;

  // Prefer DataForSEO CDN (full-size) over Google encrypted thumbnails.
  const cdn = urls.find((url) => url.includes("api.dataforseo.com/cdn"));
  if (cdn) return cdn;
  const nonThumb = urls.find(
    (url) => !url.includes("encrypted-tbn") && !url.includes("gstatic.com/shopping"),
  );
  return nonThumb || urls[0];
}

function hasUsableProductImage(image?: string) {
  if (!image) return false;
  try {
    const url = new URL(image);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

function normalizeMerchantProduct(
  raw: Record<string, unknown>,
  input: {
    category: ProductCategory;
    garment: OutfitGarmentInput;
    query: string;
    countryName: string;
    countryCode: string;
  },
): RecommendedProduct | null {
  const title = cleanProductTitle(typeof raw.title === "string" ? raw.title : "");
  if (!title) return null;
  if (/^buy\b|online australia|shop (all|men|women)|collection/i.test(title)) return null;

  const url = resolveProductUrl(extractUrlCandidates(raw));
  if (!url || isGenericGoogleSearch(url)) return null;

  const image = pickHdImage(raw);
  if (!hasUsableProductImage(image)) return null;

  const priced = extractUsablePrice(raw, input.countryCode);
  if (!priced) return null;

  const store = cleanStoreName(typeof raw.seller === "string" ? raw.seller : "Store");

  const ratingObj =
    raw.product_rating && typeof raw.product_rating === "object"
      ? (raw.product_rating as Record<string, unknown>)
      : raw.rating && typeof raw.rating === "object"
        ? (raw.rating as Record<string, unknown>)
        : null;

  return {
    id: `${input.category}-${crypto.randomUUID()}`,
    category: input.category,
    title,
    image: image!,
    price: priced.display,
    currency: priced.currency,
    store,
    url,
    rating:
      ratingObj && typeof ratingObj.value === "number" ? ratingObj.value : null,
    reviewsCount:
      ratingObj && typeof ratingObj.votes_count === "number"
        ? ratingObj.votes_count
        : null,
    country: input.countryName,
    matchedColorName: input.garment.colorName,
    matchedHex: input.garment.hex,
    query: input.query,
  };
}

function collectProductsFromMerchantItems(
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

  const visit = (node: unknown) => {
    if (products.length >= limit || !node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;

    if (typeof record.title === "string") {
      const product = normalizeMerchantProduct(record, input);
      if (product) {
        const key = dedupeKey(product);
        if (!seen.has(key)) {
          seen.add(key);
          products.push(product);
        }
      }
    }

    if (Array.isArray(record.items)) {
      for (const child of record.items) visit(child);
    }
  };

  for (const item of items) visit(item);
  return products;
}

async function postTasks(
  authHeader: string,
  tasks: Array<{
    language_name: string;
    keyword: string;
    priority: number;
    depth: number;
    tag: string;
    location_code?: number;
    location_name?: string;
  }>,
) {
  const response = await fetch(TASK_POST_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tasks),
  });

  const payload = await response.json();
  assertDataForSeoOk(payload);

  const posted = payload?.tasks;
  if (!Array.isArray(posted) || posted.length === 0) {
    throw new DataForSeoError(
      payload?.status_code ?? 0,
      payload?.status_message || "DataForSEO task_post returned no tasks",
    );
  }

  for (const task of posted) {
    if (isTaskFailureStatus(task?.status_code)) {
      throw new DataForSeoError(
        task.status_code,
        task.status_message || "DataForSEO task creation failed",
      );
    }
  }

  return posted as Array<{
    id?: string;
    tag?: string;
    status_code?: number;
    status_message?: string;
    data?: { tag?: string };
  }>;
}

async function getTaskResult(authHeader: string, taskId: string) {
  const response = await fetch(`${TASK_GET_URL}/${taskId}`, {
    method: "GET",
    headers: { Authorization: authHeader },
  });
  const payload = await response.json();
  assertDataForSeoOk(payload);
  return payload;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTaskResults(
  authHeader: string,
  taskIds: string[],
  options: { maxWaitMs?: number; intervalMs?: number } = {},
) {
  const maxWaitMs = options.maxWaitMs ?? 90_000;
  const intervalMs = options.intervalMs ?? 2_500;
  const pending = new Set(taskIds);
  const completed = new Map<string, Record<string, unknown>>();
  const failures: Error[] = [];
  const deadline = Date.now() + maxWaitMs;

  while (pending.size > 0 && Date.now() < deadline) {
    await Promise.all(
      [...pending].map(async (taskId) => {
        try {
          const payload = await getTaskResult(authHeader, taskId);
          const task = payload?.tasks?.[0] as Record<string, unknown> | undefined;
          const statusCode =
            typeof task?.status_code === "number" ? task.status_code : undefined;

          if (statusCode === 20000) {
            pending.delete(taskId);
            completed.set(taskId, task ?? {});
            return;
          }

          if (isTaskFailureStatus(statusCode)) {
            pending.delete(taskId);
            failures.push(
              new DataForSeoError(
                statusCode ?? 0,
                (typeof task?.status_message === "string" && task.status_message) ||
                  "DataForSEO task failed",
              ),
            );
          }
        } catch (error) {
          console.error("[product-recommendations] poll failed", taskId, error);
        }
      }),
    );

    if (pending.size > 0) await sleep(intervalMs);
  }

  if (completed.size === 0) {
    if (failures[0]) throw failures[0];
    throw new Error("DataForSEO task timed out");
  }

  return completed;
}

function productsFromCompletedTask(
  meta: CategoryTask,
  completedTask: Record<string, unknown>,
  countryName: string,
  countryCode: string,
  limit = PRODUCTS_PER_VARIANT,
): RecommendedProduct[] {
  const result = Array.isArray(completedTask.result) ? completedTask.result : [];
  const resultItems = (result[0] as { items?: unknown[] } | undefined)?.items;
  if (!Array.isArray(resultItems)) return [];

  return collectProductsFromMerchantItems(
    resultItems,
    {
      category: meta.category,
      garment: meta.garment,
      query: meta.keyword,
      countryName,
      countryCode,
    },
    limit,
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
  const locationCode = LOCATION_CODES[input.countryCode.toUpperCase()];

  const tops = uniqueGarments(input.looks.map((look) => look.top)).slice(
    0,
    MAX_COLOR_VARIANTS,
  );
  const bottoms = uniqueGarments(input.looks.map((look) => look.bottom)).slice(
    0,
    MAX_COLOR_VARIANTS,
  );

  const categoryTasks: CategoryTask[] = [
    ...tops.map((garment) => ({
      category: "top" as const,
      keyword: buildSearchKeyword(input.gender, garment),
      garment,
    })),
    ...bottoms.map((garment) => ({
      category: "bottom" as const,
      keyword: buildSearchKeyword(input.gender, garment),
      garment,
    })),
  ];

  const requestTags = categoryTasks.map((task) => `${task.category}:${task.keyword}`);

  const posted = await postTasks(
    authHeader,
    categoryTasks.map((task, index) => ({
      language_name: "English",
      keyword: task.keyword,
      priority: 2,
      depth: 60,
      tag: requestTags[index]!,
      ...(locationCode
        ? { location_code: locationCode }
        : { location_name: input.countryName }),
    })),
  );

  const postedWithMeta = posted.flatMap((item) => {
    const id = typeof item.id === "string" ? item.id : undefined;
    const tag =
      (typeof item.tag === "string" && item.tag) ||
      (typeof item.data?.tag === "string" ? item.data.tag : "");
    const metaIndex = requestTags.indexOf(tag);
    const meta = metaIndex >= 0 ? categoryTasks[metaIndex] : undefined;
    if (!id || !meta) return [];
    return [{ id, meta }];
  });

  const linked =
    postedWithMeta.length > 0
      ? postedWithMeta
      : posted
          .map((item, index) => ({
            id: item.id,
            meta: categoryTasks[index],
          }))
          .filter(
            (item): item is { id: string; meta: CategoryTask } =>
              Boolean(item.id && item.meta),
          );

  if (linked.length === 0) {
    throw new Error("DataForSEO did not return a task id");
  }

  console.info(
    "[product-recommendations] merchant products posted",
    linked.map((item) => ({
      id: item.id,
      category: item.meta.category,
      keyword: item.meta.keyword,
    })),
  );

  const completedById = await waitForTaskResults(
    authHeader,
    linked.map((item) => item.id),
    { maxWaitMs: 90_000, intervalMs: 2_500 },
  );

  console.info(
    "[product-recommendations] merchant completed",
    completedById.size,
    "of",
    linked.length,
  );

  const topLists: RecommendedProduct[][] = [];
  const bottomLists: RecommendedProduct[][] = [];
  const failures: unknown[] = [];

  for (const { id, meta } of linked) {
    const completed = completedById.get(id);
    if (!completed) continue;

    const products = productsFromCompletedTask(
      meta,
      completed,
      input.countryName,
      input.countryCode,
    ).filter(
      (product) =>
        hasUsableProductImage(product.image) &&
        Boolean(product.price?.trim()) &&
        Boolean(product.url) &&
        !isGenericGoogleSearch(product.url),
    );

    console.info(
      "[product-recommendations] products",
      meta.category,
      products.length,
      "from",
      meta.keyword,
    );

    if (meta.category === "top") topLists.push(products);
    else bottomLists.push(products);
  }

  const top = mergeProductsRoundRobin(topLists, PRODUCTS_PER_CATEGORY);
  const bottom = mergeProductsRoundRobin(bottomLists, PRODUCTS_PER_CATEGORY);

  if (top.length === 0 && bottom.length === 0) {
    if (failures[0]) throw failures[0];
    if (completedById.size === 0) {
      throw new Error("DataForSEO task timed out");
    }
    return { ok: true, products: { top: [], bottom: [] } };
  }

  return {
    ok: true,
    products: { top, bottom },
  };
}
