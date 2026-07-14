import { createFileRoute } from "@tanstack/react-router";
import {
  formatPlanPrice,
  getPremiumSubscriptionPlan,
} from "@/lib/api/subscriptionPlans.server";
import { getStripePublishableKey } from "@/lib/api/stripe.server";

export const Route = createFileRoute("/api/stripe-config")({
  server: {
    handlers: {
      GET: async (): Promise<Response> => {
        try {
          const [plan, publishableKey] = await Promise.all([
            getPremiumSubscriptionPlan(),
            getStripePublishableKey(),
          ]);

          if (!plan) {
            return Response.json(
              { ok: false, message: "Premium plan is not configured." },
              { status: 503 },
            );
          }

          if (!publishableKey) {
            return Response.json(
              { ok: false, message: "Stripe is not configured yet." },
              { status: 503 },
            );
          }

          return Response.json({
            ok: true,
            publishableKey,
            plan: {
              id: plan.id,
              name: plan.name,
              priceCents: plan.price_cents,
              currency: plan.currency,
              billingInterval: plan.billing_interval,
              priceLabel: formatPlanPrice(plan),
              productSuggestionsLimit: plan.product_suggestions_limit,
              tryOnsLimit: plan.try_ons_limit,
            },
          });
        } catch (error) {
          console.error("[stripe-config]", error);
          return Response.json(
            { ok: false, message: "Could not load billing configuration." },
            { status: 500 },
          );
        }
      },
    },
  },
});
