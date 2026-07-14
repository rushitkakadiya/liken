import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { PricingCard } from "@/components/cards/PricingCard";
import { fetchStripeConfig, verifyCheckoutSession, type StripePlanConfig } from "@/services/stripeService";
import { PREMIUM_MONTHLY_LIMIT } from "@/types/database";
import { pageHead } from "@/lib/seo/pages";

type PricingSearch = {
  checkout?: string;
  session_id?: string;
};

export const Route = createFileRoute("/pricing")({
  validateSearch: (search: Record<string, unknown>): PricingSearch => ({
    checkout: typeof search.checkout === "string" ? search.checkout : undefined,
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => pageHead("pricing"),
  component: Pricing,
});

function Pricing() {
  const search = useSearch({ from: "/pricing" });
  const navigate = useNavigate();
  const [plan, setPlan] = useState<StripePlanConfig | null>(null);
  const [priceLabel, setPriceLabel] = useState("$10");
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [verifyingCheckout, setVerifyingCheckout] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const config = await fetchStripeConfig();
      if (cancelled) return;

      if (config.ok) {
        setPlan(config.plan);
        setPriceLabel(config.plan.priceLabel);
      }
      setLoadingPlan(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (search.checkout !== "success" || !search.session_id) return;

    let cancelled = false;
    setVerifyingCheckout(true);

    (async () => {
      const result = await verifyCheckoutSession(search.session_id!);
      if (cancelled) return;

      if (result.ok) {
        toast.success("Welcome to Premium — your subscription is active.");
        navigate({ to: "/dashboard", replace: true });
      } else {
        toast.error(result.message);
        navigate({ to: "/pricing", replace: true, search: {} });
      }
      setVerifyingCheckout(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [search.checkout, search.session_id, navigate]);

  useEffect(() => {
    if (search.checkout === "cancel") {
      toast.message("Checkout cancelled.");
      navigate({ to: "/pricing", replace: true, search: {} });
    }
  }, [search.checkout, navigate]);

  const productLimit = plan?.productSuggestionsLimit ?? PREMIUM_MONTHLY_LIMIT;
  const tryOnLimit = plan?.tryOnsLimit ?? PREMIUM_MONTHLY_LIMIT;
  const premiumName = plan?.name ?? "Premium Monthly";

  return (
    <div className="min-h-screen">
      <Navbar />
      <main id="main-content">
      <section className="pt-16 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h1 className="text-5xl font-semibold tracking-tight">Simple, honest pricing</h1>
            <p className="text-[#a8a0a3] mt-4 text-lg">
              Color generation is free for everyone. Upgrade for products and try-on.
            </p>
            {loadingPlan && (
              <p className="text-xs text-[#a8a0a3] mt-2">Loading current plan pricing...</p>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              features={[
                "Unlimited color generations",
                "Skin tone analysis",
                "Outfit color recommendations",
                "Save looks",
              ]}
              cta="Open Studio"
            />
            <PricingCard
              name={premiumName}
              price={priceLabel}
              highlight
              plan={plan}
              checkoutLoading={verifyingCheckout}
              features={[
                "Unlimited color generations",
                `${productLimit} product suggestions / month`,
                `${tryOnLimit} AI try-ons / month`,
                "Country-based shopping links",
                "Monthly subscription via Stripe",
              ]}
              cta="Go Premium"
            />
          </div>
        </div>
      </section>
      </main>
    </div>
  );
}
