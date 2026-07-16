import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateTryOnWithFal } from "@/lib/api/falTryOn.server";
import { consumeTryOnOnServer, verifyPremiumUser } from "@/lib/supabase.server";
import { PREMIUM_MONTHLY_LIMIT } from "@/types/database";
import type { TryOnResponse } from "@/types/tryOn";

const requestSchema = z.object({
  userImageUrl: z.string().min(1),
  productImageUrl: z.string().min(1),
  productTitle: z.string().min(1),
  category: z.enum(["top", "bottom"]),
  matchedColorName: z.string().min(1),
  matchedHex: z.string().min(1),
});

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export const Route = createFileRoute("/api/try-on")({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          const error: TryOnResponse = {
            success: false,
            error: "INVALID_REQUEST",
            message: "Invalid request body.",
          };
          return Response.json(error, { status: 400 });
        }

        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) {
          const error: TryOnResponse = {
            success: false,
            error: "INVALID_REQUEST",
            message: "Missing required try-on fields.",
          };
          return Response.json(error, { status: 400 });
        }

        const token = getBearerToken(request);
        const premium = await verifyPremiumUser(token);
        if (!premium.ok) {
          const error: TryOnResponse = {
            success: false,
            error: premium.error === "PREMIUM_REQUIRED" ? "PREMIUM_REQUIRED" : "UNAUTHORIZED",
            message:
              premium.error === "PREMIUM_REQUIRED"
                ? "Upgrade to Premium to use AI virtual try-on."
                : "Your session expired. Please sign in again.",
          };
          return Response.json(error, { status: premium.error === "PREMIUM_REQUIRED" ? 403 : 401 });
        }

        if (premium.profile.try_ons_used >= PREMIUM_MONTHLY_LIMIT) {
          const error: TryOnResponse = {
            success: false,
            error: "TRYON_LIMIT_REACHED",
            message: `You have used all ${PREMIUM_MONTHLY_LIMIT} AI try-ons for this subscription month.`,
          };
          return Response.json(error, { status: 403 });
        }

        if (!parsed.data.userImageUrl) {
          const error: TryOnResponse = {
            success: false,
            error: "MISSING_USER_IMAGE",
            message: "Upload a clear photo before generating a try-on preview.",
          };
          return Response.json(error, { status: 400 });
        }

        if (!parsed.data.productImageUrl) {
          const error: TryOnResponse = {
            success: false,
            error: "MISSING_PRODUCT_IMAGE",
            message: "This product does not include an image for try-on.",
          };
          return Response.json(error, { status: 400 });
        }

        try {
          const result = await generateTryOnWithFal(parsed.data);
          const usage = await consumeTryOnOnServer(token);
          const remainingTryOns = usage.ok
            ? Math.max(0, PREMIUM_MONTHLY_LIMIT - usage.profile.try_ons_used)
            : Math.max(0, PREMIUM_MONTHLY_LIMIT - premium.profile.try_ons_used - 1);

          const response: TryOnResponse = {
            success: true,
            generatedImageUrl: result.generatedImageUrl,
            requestId: result.requestId,
            remainingTryOns,
          };
          return Response.json(response);
        } catch (error) {
          console.error("[try-on]", error);
          const message = error instanceof Error ? error.message : "UNKNOWN";

          if (message === "FAL_NOT_CONFIGURED") {
            return Response.json(
              {
                success: false,
                error: "FAL_NOT_CONFIGURED",
                message: "AI try-on is not configured. Add fal_key to Supabase app_secrets.",
              } satisfies TryOnResponse,
              { status: 503 },
            );
          }

          if (message === "PRODUCT_IMAGE_INACCESSIBLE") {
            return Response.json(
              {
                success: false,
                error: "PRODUCT_IMAGE_INACCESSIBLE",
                message: "This product image cannot be used for try-on. Try another product.",
              } satisfies TryOnResponse,
              { status: 400 },
            );
          }

          if (message === "INVALID_USER_IMAGE" || message === "INVALID_IMAGE_URL") {
            return Response.json(
              {
                success: false,
                error: "MISSING_USER_IMAGE",
                message: "Your photo could not be processed. Please re-upload a clear JPG or PNG photo.",
              } satisfies TryOnResponse,
              { status: 400 },
            );
          }

          if (message === "IMAGE_URL_PATTERN") {
            return Response.json(
              {
                success: false,
                error: "INVALID_RESPONSE",
                message:
                  "This product image format is not supported for try-on. Please try a different product.",
              } satisfies TryOnResponse,
              { status: 400 },
            );
          }

          if (message === "INVALID_FAL_RESPONSE") {
            return Response.json(
              {
                success: false,
                error: "INVALID_RESPONSE",
                message: "AI try-on returned an unexpected response. Please try again.",
              } satisfies TryOnResponse,
              { status: 502 },
            );
          }

          return Response.json(
            {
              success: false,
              error: "FAL_FAILED",
              message: "Unable to generate your try-on preview right now. Please try again.",
            } satisfies TryOnResponse,
            { status: 502 },
          );
        }
      },
    },
  },
});
