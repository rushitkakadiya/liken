import type {
  OutfitGarmentInput,
  ProductRecommendationsResponse,
  RecommendedProduct,
} from "@/types/productRecommendations";
import { getDataForSeoCredentialsFromSecrets } from "./secrets.server";

const TASK_POST_URL = "https://api.dataforseo.com/v3/merchant/google/products/task_post";
const TASK_GET_URL = "https://api.dataforseo.com/v3/merchant/google/products/task_get/advanced";
const SELLERS_AD_URL = "https://api.dataforseo.com/v3/merchant/google/sellers/ad_url";

type ProductCategory = "top" | "bottom";

const PRODUCTS_PER_VARIANT = 3;
const MAX_PRODUCTS_PER_CATEGORY = 12;

type CategoryTask = {
  category: ProductCategory;
  keyword: string;
  garment: OutfitGarmentInput;
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

async function getDataForSeoCredentials() {
  return getDataForSeoCredentialsFromSecrets();
}

function basicAuthHeader(login: string, password: string) {
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

const PENDING_TASK_STATUS_CODES = new Set([20100, 40601, 40602]);

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
  if (payload.status_code == null) return;
  if (payload.status_code === 20000) return;
  throw new DataForSeoError(payload.status_code, payload.status_message || "DataForSEO request failed");
}

export function buildSearchKeyword(gender: string, garment: OutfitGarmentInput) {
  return `${gender} ${garment.colorName} ${garment.type}`.replace(/\s+/g, " ").trim();
}

type UrlCandidates = {
  directUrl?: string;
  shoppingUrl?: string;
  shopAdAck?: string;
};

function isGoogleShoppingUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    return (
      (host.includes("google.") && path.includes("/shopping")) ||
      host === "shopping.google.com"
    );
  } catch {
    return /google\.[a-z.]+\/shopping/i.test(url) || url.includes("shopping.google.com");
  }
}

function isDirectMerchantUrl(url?: string) {
  if (!url || !url.startsWith("http")) return false;
  return !isGoogleShoppingUrl(url);
}

function extractUrlCandidates(raw: Record<string, unknown>): UrlCandidates {
  return {
    directUrl: typeof raw.url === "string" ? raw.url : undefined,
    shoppingUrl: typeof raw.shopping_url === "string" ? raw.shopping_url : undefined,
    shopAdAck: typeof raw.shop_ad_aclk === "string" ? raw.shop_ad_aclk : undefined,
  };
}

function hasResolvableUrl(candidates: UrlCandidates) {
  return (
    isDirectMerchantUrl(candidates.directUrl) ||
    Boolean(candidates.shopAdAck) ||
    Boolean(candidates.shoppingUrl)
  );
}

async function resolveSellerAdUrl(authHeader: string, shopAdAck: string) {
  const response = await fetch(`${SELLERS_AD_URL}/${encodeURIComponent(shopAdAck)}`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json();
  assertDataForSeoOk(payload);

  const adUrl = payload?.tasks?.[0]?.result?.[0]?.ad_url;
  return typeof adUrl === "string" && adUrl.startsWith("http") ? adUrl : null;
}

async function resolveMerchantUrl(
  authHeader: string,
  cache: Map<string, string>,
  candidates: UrlCandidates,
) {
  if (isDirectMerchantUrl(candidates.directUrl)) {
    return candidates.directUrl!;
  }

  if (candidates.shopAdAck) {
    const cached = cache.get(candidates.shopAdAck);
    if (cached) return cached;

    try {
      const resolved = await resolveSellerAdUrl(authHeader, candidates.shopAdAck);
      if (resolved && isDirectMerchantUrl(resolved)) {
        cache.set(candidates.shopAdAck, resolved);
        return resolved;
      }
    } catch (error) {
      console.error("[product-recommendations] ad_url resolve failed:", error);
    }
  }

  if (candidates.shoppingUrl) {
    return candidates.shoppingUrl;
  }

  return null;
}

function formatPrice(price: unknown, currency?: string) {
  if (price == null || price === "") return "";
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

function normalizeRawProduct(
  raw: Record<string, unknown>,
  input: {
    category: ProductCategory;
    garment: OutfitGarmentInput;
    query: string;
    country: string;
  },
): (RecommendedProduct & { urlCandidates: UrlCandidates }) | null {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) return null;

  const urlCandidates = extractUrlCandidates(raw);
  if (!hasResolvableUrl(urlCandidates)) return null;

  const images = Array.isArray(raw.product_images) ? raw.product_images : [];
  const image = typeof images[0] === "string" ? images[0] : "";

  const currency = typeof raw.currency === "string" ? raw.currency : "";
  const price = formatPrice(raw.price, currency);
  const store = typeof raw.seller === "string" ? raw.seller : "Store";

  const ratingObj =
    raw.product_rating && typeof raw.product_rating === "object"
      ? (raw.product_rating as Record<string, unknown>)
      : null;
  const ratingValue = ratingObj?.value;
  const rating =
    ratingValue != null && ratingValue !== "" ? Number(ratingValue) : null;
  const reviewsCount =
    typeof ratingObj?.votes_count === "number" ? ratingObj.votes_count : null;

  return {
    id: `${input.category}-${crypto.randomUUID()}`,
    category: input.category,
    title,
    image,
    price,
    currency,
    store,
    url: "",
    rating: Number.isFinite(rating) ? rating : null,
    reviewsCount,
    country: input.country,
    matchedColorName: input.garment.colorName,
    matchedHex: input.garment.hex,
    query: input.query,
    urlCandidates,
  };
}

function collectProductsFromItems(
  items: unknown[],
  input: {
    category: ProductCategory;
    garment: OutfitGarmentInput;
    query: string;
    country: string;
  },
  limit: number,
) {
  const products: Array<RecommendedProduct & { urlCandidates: UrlCandidates }> = [];
  const seen = new Set<string>();

  const visit = (node: unknown) => {
    if (products.length >= limit || !node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;

    if (typeof record.title === "string" && hasResolvableUrl(extractUrlCandidates(record))) {
      const normalized = normalizeRawProduct(record, input);
      if (!normalized) return;

      const dedupeKey =
        normalized.urlCandidates.shopAdAck ||
        normalized.urlCandidates.directUrl ||
        normalized.urlCandidates.shoppingUrl ||
        normalized.title;

      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      products.push(normalized);
    }

    if (Array.isArray(record.items)) {
      for (const child of record.items) visit(child);
    }
  };

  for (const item of items) visit(item);
  return products;
}

async function finalizeProductUrls(
  authHeader: string,
  products: Array<RecommendedProduct & { urlCandidates: UrlCandidates }>,
) {
  const adUrlCache = new Map<string, string>();
  const resolved: RecommendedProduct[] = [];

  for (const product of products) {
    const url = await resolveMerchantUrl(authHeader, adUrlCache, product.urlCandidates);
    if (!url) continue;

    const { urlCandidates: _urlCandidates, ...rest } = product;
    resolved.push({ ...rest, url });
  }

  return resolved;
}

async function postTasks(
  authHeader: string,
  tasks: Array<{
    location_name: string;
    language_name: string;
    keyword: string;
    priority: number;
    depth?: number;
    tag: string;
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
    throw new DataForSeoError(payload?.status_code ?? 0, payload?.status_message || "DataForSEO task_post returned no tasks");
  }

  for (const task of posted) {
    if (isTaskFailureStatus(task?.status_code)) {
      throw new DataForSeoError(task.status_code, task.status_message || "DataForSEO task creation failed");
    }
  }

  return posted as Array<{ id?: string; tag?: string; status_code?: number; status_message?: string }>;
}

async function getTaskResult(authHeader: string, taskId: string) {
  const response = await fetch(`${TASK_GET_URL}/${taskId}`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json();
  assertDataForSeoOk(payload);
  return payload;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll many DataForSEO tasks together — required for Vercel time limits. */
async function waitForTaskResults(
  authHeader: string,
  taskIds: string[],
  options: { maxWaitMs?: number; intervalMs?: number } = {},
) {
  const maxWaitMs = options.maxWaitMs ?? 75_000;
  const intervalMs = options.intervalMs ?? 2_000;
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
          const statusCode = typeof task?.status_code === "number" ? task.status_code : undefined;

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
            return;
          }

          if (statusCode != null && !isPendingTaskStatus(statusCode)) {
            // Unexpected non-pending status — keep polling once, else abandon
            console.warn("[product-recommendations] unexpected task status", taskId, statusCode);
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

async function productsFromCompletedTask(
  authHeader: string,
  countryName: string,
  meta: CategoryTask,
  completedTask: Record<string, unknown>,
  limit = PRODUCTS_PER_VARIANT,
): Promise<RecommendedProduct[]> {
  const result = Array.isArray(completedTask.result) ? completedTask.result : [];
  const resultItems = (result[0] as { items?: unknown[] } | undefined)?.items;
  if (!Array.isArray(resultItems)) return [];

  const rawProducts = collectProductsFromItems(
    resultItems,
    {
      category: meta.category,
      garment: meta.garment,
      query: meta.keyword,
      country: countryName,
    },
    limit,
  );

  return finalizeProductUrls(authHeader, rawProducts);
}

function dedupeKey(product: RecommendedProduct) {
  return product.url || product.title;
}

function mergeProductLists(lists: RecommendedProduct[][], max: number) {
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

function uniqueGarments(garments: OutfitGarmentInput[]) {
  const map = new Map<string, OutfitGarmentInput>();
  for (const garment of garments) {
    const key = `${garment.colorName}|${garment.hex}|${garment.type}`;
    if (!map.has(key)) map.set(key, garment);
  }
  return [...map.values()];
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
  const credentials = await getDataForSeoCredentials();
  if (!credentials) {
    throw new Error("DataForSEO credentials are not configured");
  }

  const authHeader = basicAuthHeader(credentials.login, credentials.password);

  const tops = uniqueGarments(input.looks.map((look) => look.top));
  const bottoms = uniqueGarments(input.looks.map((look) => look.bottom));

  // Cap variants so serverless deploys finish within Vercel maxDuration.
  const MAX_TASKS_PER_CATEGORY = 2;
  const categoryTasks: CategoryTask[] = [
    ...tops.slice(0, MAX_TASKS_PER_CATEGORY).map((garment) => ({
      category: "top" as const,
      keyword: buildSearchKeyword(input.gender, garment),
      garment,
    })),
    ...bottoms.slice(0, MAX_TASKS_PER_CATEGORY).map((garment) => ({
      category: "bottom" as const,
      keyword: buildSearchKeyword(input.gender, garment),
      garment,
    })),
  ];

  const posted = await postTasks(
    authHeader,
    categoryTasks.map((task, index) => ({
      location_name: input.countryName,
      language_name: "English",
      keyword: task.keyword,
      // 2 = high priority (faster queue; higher cost)
      priority: 2,
      depth: 20,
      tag: `${task.category}:${index}`,
    })),
  );

  const postedWithMeta = posted
    .map((item, index) => ({
      id: item.id,
      meta: categoryTasks[index],
    }))
    .filter((item): item is { id: string; meta: CategoryTask } => Boolean(item.id && item.meta));

  if (postedWithMeta.length === 0) {
    throw new Error("DataForSEO did not return a task id");
  }

  const completedById = await waitForTaskResults(
    authHeader,
    postedWithMeta.map((item) => item.id),
    { maxWaitMs: 75_000, intervalMs: 2_000 },
  );

  const topLists: RecommendedProduct[][] = [];
  const bottomLists: RecommendedProduct[][] = [];

  for (const { id, meta } of postedWithMeta) {
    const completed = completedById.get(id);
    if (!completed) continue;

    const products = await productsFromCompletedTask(
      authHeader,
      input.countryName,
      meta,
      completed,
    );

    if (meta.category === "top") topLists.push(products);
    else bottomLists.push(products);
  }

  if (topLists.length === 0 && bottomLists.length === 0) {
    throw new Error("DataForSEO task timed out");
  }

  const top = mergeProductLists(topLists, MAX_PRODUCTS_PER_CATEGORY);
  const bottom = mergeProductLists(bottomLists, MAX_PRODUCTS_PER_CATEGORY);

  return {
    ok: true,
    products: { top, bottom },
  };
}
