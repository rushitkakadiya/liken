import type { Look } from "@/lib/auth";
import { enrichLookColorNames } from "@/lib/lookColors";

export type ApiGarment = {
  type: string;
  colorFamily: string;
  colorName: string;
  hex: string;
};

export type ApiOutfit = {
  occasion: string;
  score: number;
  top: ApiGarment;
  bottom: ApiGarment;
  explanation: string;
};

export function mapApiOutfitsToLooks(outfits: ApiOutfit[], fallbackOccasion: string): Look[] {
  return outfits.map((outfit) =>
    enrichLookColorNames({
      id: crypto.randomUUID(),
      top: outfit.top.type,
      bottom: outfit.bottom.type,
      topColor: outfit.top.hex,
      bottomColor: outfit.bottom.hex,
      topColorName: outfit.top.colorName,
      bottomColorName: outfit.bottom.colorName,
      topColorFamily: outfit.top.colorFamily,
      bottomColorFamily: outfit.bottom.colorFamily,
      occasion: outfit.occasion || fallbackOccasion,
      score: Math.round(outfit.score),
      explanation: outfit.explanation,
      createdAt: Date.now(),
    }),
  );
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Invalid image data"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToFile(dataUrl: string, filename = "photo.jpg"): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}
