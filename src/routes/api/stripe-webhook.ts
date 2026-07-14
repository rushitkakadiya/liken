import { createFileRoute } from "@tanstack/react-router";
import { handleStripeWebhook } from "@/lib/api/stripe.server";

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        try {
          const result = await handleStripeWebhook(request);
          return Response.json(result);
        } catch (error) {
          console.error("[stripe-webhook]", error);
          return Response.json(
            {
              ok: false,
              message: error instanceof Error ? error.message : "Webhook processing failed.",
            },
            { status: 400 },
          );
        }
      },
    },
  },
});
