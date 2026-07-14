import { useRouter } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useUser, isPremium } from "@/lib/auth";
import { startPremiumCheckout, type StripePlanConfig } from "@/services/stripeService";
import { PREMIUM_MONTHLY_LIMIT } from "@/types/database";

export function PricingCard({
  name,
  price,
  features,
  highlight,
  cta = "Get Started",
  plan,
  checkoutLoading = false,
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
  cta?: string;
  plan?: StripePlanConfig | null;
  checkoutLoading?: boolean;
}) {
  const user = useUser();
  const router = useRouter();
  const premiumActive = isPremium(user);
  const isPremiumCard = !!highlight;
  const [loading, setLoading] = useState(false);

  const productLimit = plan?.productSuggestionsLimit ?? PREMIUM_MONTHLY_LIMIT;
  const tryOnLimit = plan?.tryOnsLimit ?? PREMIUM_MONTHLY_LIMIT;

  const handleClick = async () => {
    if (!user) {
      router.navigate({ to: "/login" });
      return;
    }
    if (isPremiumCard) {
      if (premiumActive) return;
      setLoading(true);
      try {
        const result = await startPremiumCheckout();
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        window.location.href = result.checkoutUrl;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not start checkout. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }
    router.navigate({ to: "/studio" });
  };

  const premiumEnds = user?.premiumExpiresAt
    ? new Date(user.premiumExpiresAt).toLocaleDateString()
    : null;

  const productLeft = productLimit - (user?.productSuggestionsUsed ?? 0);
  const tryOnLeft = tryOnLimit - (user?.tryOnsUsed ?? 0);
  const isBusy = loading || checkoutLoading;

  if (isPremiumCard && premiumActive) {
    return (
      <div className="rounded-3xl p-8 flex flex-col h-full bg-gradient-to-br from-[#ee296b] to-[#c91a55] text-white pink-glow">
        <div className="mb-6">
          <div className="text-sm uppercase tracking-wider mb-2 text-white/80">Your active plan</div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-semibold">Premium</span>
          </div>
          <p className="text-sm text-white/80 mt-2">Active until {premiumEnds ?? "—"}</p>
        </div>
        <ul className="space-y-3 mb-8 flex-1">
          <li className="flex items-start gap-3 text-sm">
            <Check size={16} className="shrink-0 mt-0.5 text-white" />
            <span className="text-white/95">Unlimited color generations</span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <Check size={16} className="shrink-0 mt-0.5 text-white" />
            <span className="text-white/95">Product suggestions left: {productLeft}</span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <Check size={16} className="shrink-0 mt-0.5 text-white" />
            <span className="text-white/95">AI try-ons left: {tryOnLeft}</span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <Check size={16} className="shrink-0 mt-0.5 text-white" />
            <span className="text-white/95">{price} / month subscription</span>
          </li>
        </ul>
        <div className="px-5 py-3 rounded-xl text-sm font-medium text-center bg-white/15 text-white border border-white/20">
          Current Plan
        </div>
      </div>
    );
  }

  if (!isPremiumCard && premiumActive) {
    return (
      <div className="rounded-3xl p-8 flex flex-col h-full glass-card opacity-70">
        <div className="mb-6">
          <div className="text-sm uppercase tracking-wider mb-2 text-[#a8a0a3]">{name}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-semibold">{price}</span>
          </div>
        </div>
        <ul className="space-y-3 mb-8 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm">
              <Check size={16} className="shrink-0 mt-0.5 text-[#ee296b]" />
              <span className="text-[#cfc7ca]">{f}</span>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 rounded-xl text-sm font-medium text-center border border-white/10 text-[#a8a0a3]">
          Not your current plan
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl p-8 flex flex-col h-full ${isPremiumCard ? "bg-gradient-to-br from-[#ee296b] to-[#c91a55] text-white pink-glow" : "glass-card"}`}>
      <div className="mb-6">
        <div className={`text-sm uppercase tracking-wider mb-2 ${isPremiumCard ? "text-white/80" : "text-[#a8a0a3]"}`}>{name}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-semibold">{price}</span>
          {price !== "$0" && <span className={isPremiumCard ? "text-white/70" : "text-[#a8a0a3]"}>/mo</span>}
        </div>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm">
            <Check size={16} className={`shrink-0 mt-0.5 ${isPremiumCard ? "text-white" : "text-[#ee296b]"}`} />
            <span className={isPremiumCard ? "text-white/95" : "text-[#cfc7ca]"}>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleClick}
        disabled={isBusy || (isPremiumCard && premiumActive)}
        className={`px-5 py-3 rounded-xl text-sm font-medium text-center inline-flex items-center justify-center gap-2 disabled:opacity-70 ${isPremiumCard ? "bg-white text-[#ee296b] hover:bg-white/90" : "btn-pink"}`}
      >
        {isBusy && <Loader2 size={16} className="animate-spin" />}
        {!user
          ? "Continue with Google"
          : isPremiumCard && premiumActive
            ? "Current Plan"
            : isPremiumCard
              ? "Go Premium"
              : cta}
      </button>
    </div>
  );
}
