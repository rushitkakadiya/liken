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

/**
 * Downscale/compress uploads before sending to Gemini.
 * Full phone photos often fail on Vercel (payload too large / timeout).
 */
export async function fileToAnalysisImage(
  file: File,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<{ base64: string; mimeType: string }> {
  const maxEdge = options.maxEdge ?? 1280;
  const quality = options.quality ?? 0.82;

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return {
      base64: await fileToBase64(file),
      mimeType: file.type || "image/jpeg",
    };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return {
        base64: await fileToBase64(file),
        mimeType: file.type || "image/jpeg",
      };
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.split(",")[1];
    if (!base64) {
      return {
        base64: await fileToBase64(file),
        mimeType: file.type || "image/jpeg",
      };
    }

    return { base64, mimeType: "image/jpeg" };
  } catch {
    return {
      base64: await fileToBase64(file),
      mimeType: file.type || "image/jpeg",
    };
  }
}

export function dataUrlToFile(dataUrl: string, filename = "photo.jpg"): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/**
 * Shrink a data-URL selfie before try-on so the API request stays under
 * Vercel/Safari payload limits (large phones often break response.json()).
 */
export async function compressDataUrlForTryOn(
  dataUrl: string,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<string> {
  if (!dataUrl.startsWith("data:")) return dataUrl;

  const maxEdge = options.maxEdge ?? 1536;
  const quality = options.quality ?? 0.85;

  if (typeof document === "undefined") return dataUrl;

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });

    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;

    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

