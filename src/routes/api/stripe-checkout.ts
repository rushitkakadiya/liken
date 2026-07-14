import { createFileRoute } from "@tanstack/react-router";
import { createPremiumCheckoutSession } from "@/lib/api/stripe.server";
import { verifyAuthenticatedUser, getSupabaseServerClient } from "@/lib/supabase.server";

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export const Route = createFileRoute("/api/stripe-checkout")({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        const token = getBearerToken(request);
        const auth = await verifyAuthenticatedUser(token);
        if (!auth.ok) {
          return Response.json(
            { ok: false, error: "UNAUTHORIZED", message: "Please sign in to continue." },
            { status: 401 },
          );
        }

        const supabase = getSupabaseServerClient(token!);
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, stripe_customer_id, plan, premium_expires_at")
          .eq("id", auth.userId)
          .maybeSingle();

        if (profileError || !profile) {
          return Response.json(
            { ok: false, error: "UNAUTHORIZED", message: "Profile not found." },
            { status: 401 },
          );
        }

        const premiumActive =
          profile.plan === "Premium" &&
          profile.premium_expires_at &&
          new Date(profile.premium_expires_at).getTime() > Date.now();

        if (premiumActive) {
          return Response.json(
            { ok: false, error: "ALREADY_PREMIUM", message: "You already have an active Premium plan." },
            { status: 409 },
          );
        }

        try {
          const session = await createPremiumCheckoutSession({
            request,
            userId: auth.userId,
            email: profile.email,
            stripeCustomerId: profile.stripe_customer_id,
          });

          return Response.json({
            ok: true,
            checkoutUrl: session.url,
            sessionId: session.id,
          });
        } catch (error) {
          console.error("[stripe-checkout]", error);
          return Response.json(
            {
              ok: false,
              error: "CHECKOUT_FAILED",
              message:
                error instanceof Error
                  ? error.message
                  : "Could not start Stripe checkout. Please try again.",
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
