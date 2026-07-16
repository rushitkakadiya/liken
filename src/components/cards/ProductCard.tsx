import { ExternalLink, Wand2 } from "lucide-react";
import type { RecommendedProduct } from "@/types/productRecommendations";

export function ProductCard({
  product,
  onTryOn,
}: {
  product: RecommendedProduct;
  onTryOn: () => void;
}) {
  return (
    <div className="glass-card overflow-hidden flex flex-col h-full">
      {/* Full product visible + soft fill (no black bars, no cropping). */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#efeae6]">
        {product.image ? (
          <>
            <img
              src={product.image}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-125 object-cover opacity-45 blur-2xl"
              decoding="async"
              referrerPolicy="no-referrer"
            />
            <img
              src={product.image}
              alt={product.title}
              className="absolute inset-0 z-10 h-full w-full object-contain object-center"
              width={400}
              height={533}
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </>
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: product.matchedHex }} />
        )}
        <span className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider bg-black/55 backdrop-blur text-white border border-white/10">
          {product.country}
        </span>
        <span
          className="absolute top-3 right-3 z-20 h-5 w-5 rounded-full ring-1 ring-black/10 ring-offset-1 ring-offset-[#efeae6]"
          style={{ backgroundColor: product.matchedHex }}
          title={product.matchedColorName}
        />
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1 min-h-[132px] sm:min-h-[152px]">
        <div className="text-[11px] sm:text-xs text-[#a8a0a3] truncate min-h-[1rem]">
          {product.store}
        </div>
        <div className="text-xs sm:text-sm font-medium mt-1 line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem] leading-snug">
          {product.title}
        </div>
        <div className="text-xs sm:text-sm text-[#ee296b] mt-1.5 sm:mt-2 font-semibold tabular-nums min-h-[1.1rem] sm:min-h-[1.25rem]">
          {product.price || "Price unavailable"}
        </div>

        <div className="grid grid-cols-2 gap-1 sm:gap-1.5 mt-auto pt-2.5 sm:pt-3">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 sm:h-9 inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 rounded-full border border-white/10 text-[10px] sm:text-xs font-medium leading-none text-white hover:border-white/20 whitespace-nowrap"
          >
            <ExternalLink size={11} className="shrink-0 sm:hidden" />
            <ExternalLink size={12} className="shrink-0 hidden sm:block" />
            <span className="whitespace-nowrap">View</span>
          </a>
          <button
            type="button"
            onClick={onTryOn}
            className="h-8 sm:h-9 inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 rounded-full btn-pink text-[10px] sm:text-xs font-medium leading-none whitespace-nowrap"
          >
            <Wand2 size={11} className="shrink-0 sm:hidden" />
            <Wand2 size={12} className="shrink-0 hidden sm:block" />
            <span className="whitespace-nowrap">Try On</span>
          </button>
        </div>
      </div>
    </div>
  );
}
