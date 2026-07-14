import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { fetchProductRecommendations, getDataForSeoUserMessage } from "@/lib/api/dataforseo.server";
import {
  buildProductCacheKey,
  getCachedProductRecommendations,
  setCachedProductRecommendations,
} from "@/lib/api/productRecommendationsCache.server";
import { consumeProductSuggestionOnServer, verifyPremiumUser } from "@/lib/supabase.server";
import { PREMIUM_MONTHLY_LIMIT } from "@/types/database";
import type { ProductRecommendationsResult } from "@/types/productRecommendations";

const garmentSchema = z.object({
  type: z.string().min(1),
  colorName: z.string().min(1),
  hex: z.string().min(1),
});

const requestSchema = z.object({
  countryName: z.string().min(1),
  countryCode: z.string().min(1),
  gender: z.string().min(1),
  looks: z
    .array(
      z.object({
        top: garmentSchema,
        bottom: garmentSchema,
      }),
    )
    .min(1),
});

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export const Route = createFileRoute("/api/product-recommendations")({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          const error: ProductRecommendationsResult = {
            ok: false,
            error: "INVALID_REQUEST",
            message: "Invalid request body.",
          };
          return Response.json(error, { status: 400 });
        }

        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) {
          const error: ProductRecommendationsResult = {
            ok: false,
            error: "INVALID_REQUEST",
            message: "countryName, gender, and looks are required.",
          };
          return Response.json(error, { status: 400 });
        }

        const token = getBearerToken(request);
        const premium = await verifyPremiumUser(token);
        if (!premium.ok) {
          const error: ProductRecommendationsResult = {
            ok: false,
            error: premium.error,
            message:
              premium.error === "PREMIUM_REQUIRED"
                ? "Upgrade to Premium to view products available in your country."
                : "Your session expired. Please sign out and sign in again.",
          };
          return Response.json(error, { status: premium.error === "PREMIUM_REQUIRED" ? 403 : 401 });
        }

        if (premium.profile.product_suggestions_used >= PREMIUM_MONTHLY_LIMIT) {
          const error: ProductRecommendationsResult = {
            ok: false,
            error: "PRODUCT_LIMIT_REACHED",
            message: `You have used all ${PREMIUM_MONTHLY_LIMIT} product suggestions for this subscription month.`,
          };
          return Response.json(error, { status: 403 });
        }

        const cacheKey = buildProductCacheKey(parsed.data);
        const cached = getCachedProductRecommendations(cacheKey);

        try {
          const result =
            cached ?? (await fetchProductRecommendations(parsed.data));

          if (!cached) {
            setCachedProductRecommendations(cacheKey, result);
          }

          const usage = await consumeProductSuggestionOnServer(token);
          const used = usage.ok
            ? usage.profile.product_suggestions_used
            : premium.profile.product_suggestions_used + 1;

          return Response.json({
            ...result,
            remainingProductSuggestions: Math.max(0, PREMIUM_MONTHLY_LIMIT - used),
            profile: usage.ok
              ? {
                  product_suggestions_used: usage.profile.product_suggestions_used,
                  try_ons_used: usage.profile.try_ons_used,
                  credits: usage.profile.credits,
                  looks_generated: usage.profile.looks_generated,
                  plan: usage.profile.plan,
                  premium_expires_at: usage.profile.premium_expires_at,
                }
              : undefined,
          } satisfies ProductRecommendationsResult);
        } catch (error) {
          console.error("[product-recommendations]", error);
          const errorResponse: ProductRecommendationsResult = {
            ok: false,
            error: "FETCH_FAILED",
            message: getDataForSeoUserMessage(error),
          };
          return Response.json(errorResponse, { status: 502 });
        }
      },
    },
  },
});
