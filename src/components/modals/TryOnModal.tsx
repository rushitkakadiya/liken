import { useEffect, useState } from "react";
import { X, Wand2, Image as ImageIcon, Download, RotateCcw, ExternalLink, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateTryOn, getRemainingTryOns } from "@/services/virtualTryOnService";
import type { Product } from "@/services/productRecommendationService";
import { ContainedPhoto } from "@/components/ui/ContainedPhoto";

export function TryOnModal({
  open,
  onClose,
  userImage,
  product,
  onTryAnother,
}: {
  open: boolean;
  onClose: () => void;
  userImage: string | null;
  product: Product | null;
  onTryAnother?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(getRemainingTryOns());

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setError(null);
    setLoading(false);
    setRemaining(getRemainingTryOns());
  }, [open, product?.id]);

  const run = async () => {
    if (!userImage || !product) return;
    setLoading(true);
    setPreview(null);
    setError(null);

    try {
      const result = await generateTryOn({ userImage, product });
      setPreview(result.generatedImageUrl);
      setRemaining(result.remainingTryOns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate your try-on preview right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setPreview(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  const downloadPreview = () => {
    if (!preview) return;
    const anchor = document.createElement("a");
    anchor.href = preview;
    anchor.download = "liken-try-on.png";
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.click();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm grid place-items-center px-4 py-8 overflow-y-auto"
          onClick={close}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full max-w-4xl p-6 sm:p-8 relative"
          >
            <button onClick={close} className="absolute top-4 right-4 text-[#a8a0a3] hover:text-white">
              <X size={18} />
            </button>

            <h2 className="text-2xl font-semibold mb-1">Try This On Me</h2>
            <p className="text-sm text-[#a8a0a3] mb-2">AI-powered preview of how this piece looks on you.</p>
            <p className="text-xs text-[#a8a0a3] mb-6">{remaining} of 15 AI try-ons remaining this month</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Panel label="Your photo">
                {userImage ? (
                  <FillImage
                    src={userImage}
                    alt="Your photo"
                    fit="contain"
                    tone="light"
                    showBlur={false}
                  />
                ) : (
                  <Empty text="No photo uploaded" />
                )}
              </Panel>
              <Panel label="Selected product">
                {product?.image ? (
                  <FillImage src={product.image} alt={product.title} fit="cover" tone="light" />
                ) : (
                  <Empty text="No product image" />
                )}
              </Panel>
              <Panel label="Generated preview">
                {loading ? (
                  <div className="absolute inset-0 grid place-items-center text-[#a8a0a3] text-xs text-center px-4">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={22} className="animate-spin text-[#ee296b]" />
                      <span>Generating your AI try-on preview...</span>
                    </div>
                  </div>
                ) : preview ? (
                  <FillImage src={preview} alt="Generated try-on preview" fit="contain" tone="dark" />
                ) : (
                  <Empty text="Click Generate Preview" />
                )}
              </Panel>
            </div>

            {error && (
              <div className="glass-card p-4 border border-red-500/30 text-sm text-red-200 mb-5">
                {error}
              </div>
            )}

            {!preview ? (
              <div className="flex justify-center">
                <button
                  onClick={run}
                  disabled={loading || !userImage || !product?.image}
                  className="px-8 py-3 rounded-full btn-pink text-sm font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  <Wand2 size={14} /> {loading ? "Generating…" : "Generate Preview"}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={downloadPreview}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-sm text-white hover:border-white/20"
                >
                  <Download size={14} /> Download
                </button>
                <button
                  onClick={() => {
                    onTryAnother?.();
                    close();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-sm text-white hover:border-white/20"
                >
                  <RotateCcw size={14} /> Try Another Product
                </button>
                {product?.url && (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full btn-pink text-sm font-medium"
                  >
                    <ExternalLink size={14} /> View Product
                  </a>
                )}
              </div>
            )}

            {error && !loading && (
              <div className="flex justify-center mt-5">
                <button
                  onClick={run}
                  disabled={!userImage || !product?.image}
                  className="px-8 py-3 rounded-full btn-pink text-sm font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  <Wand2 size={14} /> Retry
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase tracking-wider text-[#a8a0a3] mb-2">{label}</div>
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#181516] border border-white/10">
        {children}
      </div>
    </div>
  );
}

function FillImage({
  src,
  alt,
  tone = "dark",
  fit = "contain",
  showBlur = true,
}: {
  src: string;
  alt: string;
  tone?: "dark" | "light";
  fit?: "contain" | "cover";
  showBlur?: boolean;
}) {
  return (
    <ContainedPhoto
      src={src}
      alt={alt}
      tone={tone}
      fit={fit}
      showBlur={showBlur}
      className="absolute inset-0 h-full w-full"
    />
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#a8a0a3] text-xs px-4 text-center">
      <ImageIcon size={18} className="shrink-0" />
      <span className="leading-tight">{text}</span>
    </div>
  );
}
