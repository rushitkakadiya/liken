import type { ColorAnalysisResult } from "@/types/colorAnalysis";
import { generateOutfit } from "@/lib/styling";

const MOCK_RECOMMENDED_COLORS = [
  { colorFamily: "Blue", colorName: "Midnight Navy", hex: "#24364D", reason: "Rich contrast that complements warm undertones." },
  { colorFamily: "Green", colorName: "Olive Drab", hex: "#59624C", reason: "Earthy green that balances natural skin warmth." },
  { colorFamily: "Red", colorName: "Deep Maroon", hex: "#6C2436", reason: "Deep red tones enhance medium complexions." },
  { colorFamily: "Neutral", colorName: "Soft Cream", hex: "#D9C8AA", reason: "Soft neutral that keeps outfits light and refined." },
];

export function generateMockColorAnalysis(input: {
  occasion: string;
  outfitCount: number;
}): ColorAnalysisResult {
  const outfits = Array.from({ length: input.outfitCount }, () => generateOutfit(input.occasion));

  return {
    skinTone: "Medium Warm",
    undertone: "Warm undertone detected",
    contrastLevel: "Medium",
    hairColor: "Dark Brown",
    eyeColor: "Brown",
    recommendedColors: MOCK_RECOMMENDED_COLORS,
    outfits,
  };
}
