import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Wand2, RotateCcw, X, Lock, ShoppingBag, Sparkles, Shirt } from "lucide-react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardNavbar } from "@/components/layout/Navbar";
import { UploadCard, FormField, ChipGroup } from "@/components/cards/UploadCard";
import { OutfitResultCard } from "@/components/cards/OutfitResultCard";
import { ProductCard } from "@/components/cards/ProductCard";
import { PremiumLockModal } from "@/components/modals/PremiumLockModal";
import { TryOnModal } from "@/components/modals/TryOnModal";
import { saveLookAsync, useUser, isPremium } from "@/lib/auth";
import { getRemainingProductSuggestions, getRemainingTryOnsFromUser, PREMIUM_MONTHLY_LIMIT } from "@/services/usageService";
import { usePersistedStudio } from "@/hooks/use-persisted-studio";
import {
  analyzeStyleFromImage,
  ColorAnalysisError,
  dataUrlToFile,
} from "@/services/colorAnalysisService";
import {
  fetchProductRecommendations,
  hasAnyProducts,
  looksToOutfitInputs,
  type Product,
  type ProductGroups,
} from "@/services/productRecommendationService";
import { checkTryOnAllowed } from "@/services/virtualTryOnService";
import { ColorAnalysisErrorBanner, ColorAnalysisSummary } from "@/components/cards/ColorAnalysisSummary";
import { pageHead } from "@/lib/seo/pages";

export const Route = createFileRoute("/studio")({
  head: () => pageHead("studio"),
  component: () => <ProtectedRoute><Studio /></ProtectedRoute>,
});

function ProductGroupSection({
  title,
  products,
  onTryOn,
}: {
  title: string;
  products: Product[];
  onTryOn: (product: Product) => void;
}) {
  const colorGroups = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of products) {
      const key = `${product.matchedColorName}|${product.matchedHex}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(product);
    }
    return [...map.values()];
  }, [products]);

  if (products.length === 0) return null;

  return (
    <div className="mb-10">
      <h3 className="text-sm font-medium uppercase tracking-wider text-[#a8a0a3] mb-5">{title}</h3>
      {colorGroups.map((group) => {
        const colorName = group[0]?.matchedColorName ?? "Suggested color";
        const hex = group[0]?.matchedHex ?? "#888";

        return (
          <div key={`${colorName}-${hex}`} className="mb-8 last:mb-0">
            <div className="flex items-center gap-2.5 mb-4">
              <span
                className="h-4 w-4 rounded-full ring-1 ring-white/20 shrink-0"
                style={{ backgroundColor: hex }}
              />
              <span className="text-sm font-medium text-white">{colorName}</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 items-stretch">
              {group.map((product) => (
                <ProductCard key={product.id} product={product} onTryOn={() => onTryOn(product)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UsagePill({
  icon,
  label,
  left,
  total,
}: {
  icon: React.ReactNode;
  label: string;
  left: number;
  total: number;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;

  return (
    <div className="min-w-0 w-full h-full flex flex-col items-center justify-center text-center sm:items-start sm:text-left px-2 py-2 sm:min-w-[7.5rem] sm:px-3.5 sm:py-2.5 rounded-2xl bg-[#0e090a]/60 border border-white/[0.06]">
      <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-2 sm:mb-2">
        <span className="text-[#ee296b]">{icon}</span>
        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#a8a0a3] text-center sm:text-left leading-tight">
          {label}
        </span>
      </div>
      <div className="flex items-baseline justify-center sm:justify-start gap-1">
        <span className="text-base sm:text-lg font-semibold tabular-nums leading-none">{left}</span>
        <span className="text-[10px] sm:text-[11px] text-[#a8a0a3] hidden sm:inline">/ {total}</span>
      </div>
      <div className="mt-1.5 sm:mt-2 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden hidden sm:block">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#ee296b] to-[#ff6b9d] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StudioPlanStatus({
  premium,
  productLeft,
  tryOnLeft,
}: {
  premium: boolean;
  productLeft: number;
  tryOnLeft: number;
}) {
  if (!premium) {
    return (
      <div className="glass-card px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto self-stretch sm:self-auto">
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center text-[#a8a0a3] shrink-0">
          <Sparkles size={16} className="sm:hidden" />
          <Sparkles size={18} className="hidden sm:block" />
        </div>
        <div className="min-w-0">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-[#a8a0a3]">Current plan</div>
          <div className="text-sm sm:text-base font-semibold tracking-tight mt-0.5">Free</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-1 sm:p-1.5 grid grid-cols-3 items-stretch justify-items-stretch gap-1 sm:flex sm:flex-wrap sm:items-stretch sm:gap-1.5 w-full sm:w-auto self-stretch sm:self-auto">
      <div className="min-w-0 px-2 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-gradient-to-br from-[#ee296b]/20 via-[#ee296b]/10 to-transparent border border-[#ee296b]/25 flex flex-col items-center justify-center gap-1 sm:flex-row sm:items-center sm:gap-3 sm:min-w-0">
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl btn-pink grid place-items-center shadow-[0_0_20px_rgba(238,41,107,0.35)] shrink-0">
          <Sparkles size={16} className="sm:hidden" />
          <Sparkles size={18} className="hidden sm:block" />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-[#ee296b]/90 leading-tight">
            Plan
          </div>
          <div className="text-sm sm:text-base font-semibold tracking-tight mt-0.5">Premium</div>
        </div>
      </div>
      <UsagePill
        icon={<ShoppingBag size={14} />}
        label="Products"
        left={productLeft}
        total={PREMIUM_MONTHLY_LIMIT}
      />
      <UsagePill
        icon={<Shirt size={14} />}
        label="Try-ons"
        left={tryOnLeft}
        total={PREMIUM_MONTHLY_LIMIT}
      />
    </div>
  );
}

function Studio() {
  const user = useUser();
  const premium = isPremium(user);

  const [
    {
      image,
      gender,
      occasion,
      style,
      mood,
      results,
      analysis,
      error,
      productState,
      productError,
      products,
    },
    {
      setImage,
      setGender,
      setOccasion,
      setStyle,
      setMood,
      setResults,
      setAnalysis,
      setError,
      setProductState,
      setProductError,
      setProducts,
      clearSession,
    },
  ] = usePersistedStudio(user?.id, {
    gender: user?.genderPref ?? "Men",
    style: user?.stylePref ?? "Minimal",
    mood: user?.moodPref ?? "Natural",
  });

  const [loading, setLoading] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | undefined>();
  const [tryOnProduct, setTryOnProduct] = useState<Product | null>(null);

  const resetProducts = () => {
    setProducts(null);
    setProductState("idle");
    setProductError(null);
  };

  const generate = async () => {
    if (!image) {
      setError("Please upload a clear photo of yourself before generating outfit suggestions.");
      toast.error("Upload a photo first");
      return;
    }

    setLoading(true);
    setResults([]);
    setAnalysis(null);
    setError(null);
    resetProducts();

    try {
      const data = await analyzeStyleFromImage({
        imageFile: dataUrlToFile(image),
        gender,
        occasion,
        stylePreference: style,
        colorMood: mood,
        outfitCount: 3,
      });
      setAnalysis(data);
      setResults(data.outfits);
    } catch (err) {
      const message = err instanceof ColorAnalysisError ? err.message : "Color analysis failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!premium) {
      setLockMessage(undefined);
      setLockOpen(true);
      return;
    }

    if (results.length === 0) return;

    if (!user?.countryName || !user?.countryCode) {
      toast.error("Set your country in your profile first");
      return;
    }

    if (getRemainingProductSuggestions(user) <= 0) {
      toast.error(`You have used all ${PREMIUM_MONTHLY_LIMIT} product suggestions for this subscription month.`);
      return;
    }

    setProductState("loading");
    setProductError(null);
    setProducts(null);

    const response = await fetchProductRecommendations({
      countryName: user.countryName,
      countryCode: user.countryCode,
      gender,
      looks: looksToOutfitInputs(results),
    });

    if (!response.ok) {
      setProductState("error");
      setProductError(response.message);
      if (response.error === "PREMIUM_REQUIRED") {
        setLockMessage(undefined);
        setLockOpen(true);
      }
      return;
    }

    setProducts(response.products);
    setProductState(hasAnyProducts(response.products) ? "success" : "empty");
  };

  const onTryOn = (p: Product) => {
    if (!premium) {
      setLockMessage("Upgrade to Premium to use AI virtual try-on.");
      setLockOpen(true);
      return;
    }
    if (!image) return toast.error("Upload a photo first");
    const allowed = checkTryOnAllowed();
    if (!allowed.ok) return toast.error(allowed.message);
    if (!p.image) return toast.error("This product image cannot be used for try-on.");
    setTryOnProduct(p);
  };

  return (
    <div className="min-h-screen">
      <DashboardNavbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">AI Styling Studio</h1>
            <p className="text-[#a8a0a3] mt-2">Upload your photo and generate outfit recommendations.</p>
          </div>
          <StudioPlanStatus
            premium={premium}
            productLeft={getRemainingProductSuggestions(user)}
            tryOnLeft={getRemainingTryOnsFromUser(user)}
          />
        </div>

        <div className="glass-card p-6 sm:p-10">
          <div className="grid lg:grid-cols-2 gap-8">
            <UploadCard value={image} onChange={setImage} />
            <div className="space-y-5">
              <FormField label="Gender preference">
                <ChipGroup options={["Men", "Women", "Unisex"]} value={gender} onChange={setGender} />
              </FormField>
              <FormField label="Occasion">
                <ChipGroup options={["Casual", "Office", "Date Night", "Wedding", "Party", "Interview"]} value={occasion} onChange={setOccasion} />
              </FormField>
              <FormField label="Style preference">
                <ChipGroup options={["Minimal", "Luxury", "Streetwear", "Formal", "Traditional"]} value={style} onChange={setStyle} />
              </FormField>
              <FormField label="Color mood">
                <ChipGroup options={["Dark", "Light", "Natural", "Bold"]} value={mood} onChange={setMood} />
              </FormField>
              <button onClick={generate} disabled={loading} className="w-full px-6 py-4 rounded-full btn-pink text-sm font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2">
                {loading ? "Generating…" : (<><Wand2 size={16} /> Generate Outfits</>)}
              </button>
            </div>
          </div>
        </div>

        {(loading || results.length > 0 || error) && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold">Recommended colors</h2>
              {results.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={generate} className="text-sm text-[#a8a0a3] hover:text-white inline-flex items-center gap-2">
                    <RotateCcw size={14} /> Regenerate
                  </button>
                  <button
                    onClick={() => {
                      clearSession();
                    }}
                    className="text-sm text-[#a8a0a3] hover:text-white inline-flex items-center gap-2"
                  >
                    <X size={14} /> Clear
                  </button>
                </div>
              )}
            </div>
            {error && !loading && <ColorAnalysisErrorBanner message={error} />}
            {analysis && !loading && <ColorAnalysisSummary analysis={analysis} />}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {loading && [0, 1, 2].map((i) => <div key={i} className="glass-card p-6 animate-pulse h-80" />)}
              {results.map((r) => (
                <OutfitResultCard
                  key={r.id}
                  look={r}
                  onSave={async () => {
                    try {
                      await saveLookAsync(r);
                      toast.success("Look saved");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to save look");
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-12">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold inline-flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#ee296b]" />
                  Available Products In Your Country
                </h2>
                {!premium && (
                  <p className="text-xs text-[#a8a0a3] mt-1">
                    Upgrade to Premium to view products available in your country.
                  </p>
                )}
              </div>
              {premium && productState !== "loading" && (
                <button
                  onClick={loadProducts}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full btn-pink text-sm font-medium self-center sm:self-auto"
                >
                  <ShoppingBag size={14} /> Show Matching Products
                </button>
              )}
            </div>

            {!premium && (
              <div className="glass-card p-6 text-sm text-[#a8a0a3]">
                Upgrade to Premium to view products available in your country.
              </div>
            )}

            {premium && productState === "loading" && (
              <div className="glass-card p-6 text-sm text-[#a8a0a3] animate-pulse">
                Finding products available in your country...
              </div>
            )}

            {premium && productState === "error" && productError && (
              <div className="glass-card p-6 text-sm text-red-200 border border-red-500/30">
                {productError}
              </div>
            )}

            {premium && productState === "empty" && (
              <div className="glass-card p-6 text-sm text-[#a8a0a3]">
                No matching products found.
              </div>
            )}

            {premium && productState === "success" && products && (
              <>
                <ProductGroupSection title="Top Wear" products={products.top} onTryOn={onTryOn} />
                <ProductGroupSection title="Bottom Wear" products={products.bottom} onTryOn={onTryOn} />
              </>
            )}
          </div>
        )}
      </main>

      <PremiumLockModal
        open={lockOpen}
        onClose={() => {
          setLockOpen(false);
          setLockMessage(undefined);
        }}
        message={lockMessage}
      />
      <TryOnModal
        open={!!tryOnProduct}
        onClose={() => setTryOnProduct(null)}
        userImage={image}
        product={tryOnProduct}
        onTryAnother={() => setTryOnProduct(null)}
      />
    </div>
  );
}
