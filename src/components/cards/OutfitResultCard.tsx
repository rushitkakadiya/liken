import { motion } from "framer-motion";
import { Bookmark, Trash2 } from "lucide-react";
import type { Look } from "@/lib/auth";
import { colorNameFor } from "@/lib/lookColors";

function GarmentSwatch({
  label,
  garment,
  colorName,
  colorFamily,
  hex,
}: {
  label: string;
  garment: string;
  colorName?: string;
  colorFamily?: string;
  hex: string;
}) {
  const displayName = colorNameFor(colorName, colorFamily, garment);

  return (
    <div className="text-center">
      <div className="aspect-square rounded-2xl mb-2 ring-1 ring-white/10" style={{ backgroundColor: hex }} />
      <div className="text-[10px] uppercase text-[#a8a0a3]">{label}</div>
      <div className="text-xs text-white mt-0.5 truncate" title={garment}>
        {garment}
      </div>
      <div className="text-[11px] text-[#ee296b] mt-0.5 truncate font-medium" title={displayName}>
        {displayName}
      </div>
    </div>
  );
}

export function OutfitResultCard({ look, onSave, onDelete }: { look: Look; onSave?: () => void; onDelete?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 hover:border-white/10 transition flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs uppercase tracking-wider text-[#a8a0a3]">{look.occasion}</span>
        <span className="text-sm font-semibold text-[#ee296b]">{look.score}%</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <GarmentSwatch label="Top" garment={look.top} colorName={look.topColorName} colorFamily={look.topColorFamily} hex={look.topColor} />
        <GarmentSwatch label="Bottom" garment={look.bottom} colorName={look.bottomColorName} colorFamily={look.bottomColorFamily} hex={look.bottomColor} />
      </div>

      <p className="text-sm text-[#a8a0a3] leading-relaxed mb-5 flex-1 min-h-[4.5rem]">{look.explanation}</p>

      <div className="flex gap-2 mt-auto">
        {onSave && (
          <button onClick={onSave} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full btn-pink text-sm font-medium">
            <Bookmark size={14} /> Save Look
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-white/10 text-sm text-[#a8a0a3] hover:text-white hover:border-white/20">
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>
    </motion.div>
  );
}
