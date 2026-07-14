import type { ColorAnalysisResult } from "@/types/colorAnalysis";

export function ColorAnalysisSummary({ analysis }: { analysis: ColorAnalysisResult }) {
  const topScore = analysis.outfits[0]?.score;
  const swatches = analysis.recommendedColors.slice(0, 4);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <div className="glass-card p-4">
        <div className="text-[11px] text-[#a8a0a3] uppercase tracking-wider">Skin tone</div>
        <div className="text-xl font-semibold mt-1">{analysis.skinTone}</div>
        <div className="text-[11px] text-[#a8a0a3] mt-1">{analysis.undertone}</div>
        {analysis.contrastLevel && (
          <div className="text-[11px] text-[#a8a0a3] mt-1">{analysis.contrastLevel} contrast</div>
        )}
      </div>

      <div className="glass-card p-4 sm:col-span-2">
        <div className="text-[11px] text-[#a8a0a3] uppercase tracking-wider mb-2">Best colors</div>
        <div className="flex gap-2 flex-wrap">
          {analysis.recommendedColors.map((color) => (
            <div
              key={`${color.colorName}-${color.hex}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px]"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color.hex }} />
              {color.colorName}
            </div>
          ))}
        </div>
      </div>

      {topScore != null && (
        <div className="glass-card p-4 bg-gradient-to-br from-[#ee296b]/20 to-transparent border-[#ee296b]/30">
          <div className="text-[11px] text-white/80 uppercase tracking-wider">Outfit score</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-gradient-pink">{topScore}%</span>
            <span className="text-xs text-[#a8a0a3]">match</span>
          </div>
        </div>
      )}

      <div className="grid grid-flow-col auto-cols-fr gap-2 sm:col-span-2 lg:col-span-4">
        {swatches.map((color) => (
          <div
            key={`swatch-${color.hex}`}
            className="aspect-square rounded-xl ring-1 ring-white/10"
            style={{ backgroundColor: color.hex }}
            title={color.colorName}
          />
        ))}
      </div>
    </div>
  );
}

export function ColorAnalysisErrorBanner({ message }: { message: string }) {
  return (
    <div className="glass-card p-4 border border-red-500/30 text-sm text-red-200 mb-5">
      {message}
    </div>
  );
}
