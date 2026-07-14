import { z } from "zod";
import type { ColorAnalysisResult } from "@/types/colorAnalysis";
import {
  ColorAnalysisError,
  COLOR_ANALYSIS_ERROR_MESSAGES,
} from "@/types/colorAnalysis";
import { mapApiOutfitsToLooks } from "@/services/colorAnalysisMappers";

const hexSchema = z.string().regex(/^#[0-9A-Fa-f]{3,6}$/);

const garmentSchema = z.object({
  type: z.string().min(1),
  colorFamily: z.string().min(1),
  colorName: z.string().min(1),
  hex: hexSchema,
});

const recommendedColorSchema = z
  .object({
    colorFamily: z.string().min(1).optional(),
    colorName: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    hex: hexSchema,
    reason: z.string().min(1),
  })
  .refine((color) => Boolean(color.colorName || color.name), {
    message: "colorName or name is required",
  });

const colorAnalysisSchema = z.object({
  skinTone: z.string().min(1),
  undertone: z.string().min(1),
  contrastLevel: z.string().optional(),
  hairColor: z.string().optional(),
  eyeColor: z.string().optional(),
  recommendedColors: z.array(recommendedColorSchema).min(1),
  outfits: z
    .array(
      z.object({
        occasion: z.string().min(1),
        score: z.number().min(85).max(100),
        top: garmentSchema,
        bottom: garmentSchema,
        explanation: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
});

const noFaceSchema = z.object({
  error: z.literal("NO_FACE_DETECTED"),
});

function stripJsonFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function normalizeHex(hex: string) {
  const clean = hex.trim();
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    const h = clean.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }
  return clean.toUpperCase();
}

export function parseColorAnalysisResponse(rawText: string, fallbackOccasion: string): ColorAnalysisResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(rawText));
  } catch {
    throw new ColorAnalysisError("INVALID_JSON", COLOR_ANALYSIS_ERROR_MESSAGES.INVALID_JSON);
  }

  const noFace = noFaceSchema.safeParse(parsed);
  if (noFace.success) {
    throw new ColorAnalysisError("NO_FACE", COLOR_ANALYSIS_ERROR_MESSAGES.NO_FACE);
  }

  const validated = colorAnalysisSchema.safeParse(parsed);
  if (!validated.success) {
    throw new ColorAnalysisError("INVALID_JSON", COLOR_ANALYSIS_ERROR_MESSAGES.INVALID_JSON);
  }

  const data = validated.data;
  return {
    skinTone: data.skinTone,
    undertone: data.undertone,
    contrastLevel: data.contrastLevel,
    hairColor: data.hairColor,
    eyeColor: data.eyeColor,
    recommendedColors: data.recommendedColors.map((color) => ({
      colorFamily: color.colorFamily ?? "Neutral",
      colorName: color.colorName ?? color.name ?? "Unknown",
      hex: normalizeHex(color.hex),
      reason: color.reason,
    })),
    outfits: mapApiOutfitsToLooks(
      data.outfits.map((outfit) => ({
        ...outfit,
        top: { ...outfit.top, hex: normalizeHex(outfit.top.hex) },
        bottom: { ...outfit.bottom, hex: normalizeHex(outfit.bottom.hex) },
      })),
      fallbackOccasion,
    ),
  };
}
