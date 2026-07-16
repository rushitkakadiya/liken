import { z } from "zod";
import type { ColorAnalysisResult } from "@/types/colorAnalysis";
import {
  ColorAnalysisError,
  COLOR_ANALYSIS_ERROR_MESSAGES,
} from "@/types/colorAnalysis";
import { mapApiOutfitsToLooks } from "@/services/colorAnalysisMappers";

function normalizeHex(hex: string) {
  let clean = hex.trim().replace(/^['"]|['"]$/g, "");
  if (!clean.startsWith("#")) clean = `#${clean}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    const h = clean.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
    return clean.toUpperCase();
  }
  // Strip alpha channel if model returns #RRGGBBAA
  if (/^#[0-9A-Fa-f]{8}$/.test(clean)) {
    return clean.slice(0, 7).toUpperCase();
  }
  return clean.toUpperCase();
}

const hexSchema = z
  .union([z.string(), z.number()])
  .transform((value) => normalizeHex(String(value)))
  .refine((value) => /^#[0-9A-Fa-f]{6}$/.test(value), { message: "Invalid hex color" });

const nonEmptyString = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => value.length > 0, { message: "Required string" });

const garmentSchema = z.object({
  type: nonEmptyString,
  colorFamily: nonEmptyString.optional().default("Neutral"),
  colorName: nonEmptyString,
  hex: hexSchema,
});

const recommendedColorSchema = z
  .object({
    colorFamily: nonEmptyString.optional(),
    colorName: nonEmptyString.optional(),
    name: nonEmptyString.optional(),
    hex: hexSchema,
    reason: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) =>
        value == null || String(value).trim() === ""
          ? "Recommended for your complexion."
          : String(value).trim(),
      ),
  })
  .refine((color) => Boolean(color.colorName || color.name), {
    message: "colorName or name is required",
  });

const outfitSchema = z.object({
  occasion: nonEmptyString.optional().default("Casual"),
  score: z.coerce
    .number()
    .catch(90)
    .transform((score) => {
      if (!Number.isFinite(score)) return 90;
      return Math.max(85, Math.min(100, Math.round(score)));
    }),
  top: garmentSchema,
  bottom: garmentSchema,
  explanation: nonEmptyString.optional().default("A balanced look for your coloring."),
});

const colorAnalysisSchema = z.object({
  skinTone: nonEmptyString,
  undertone: nonEmptyString,
  contrastLevel: z.string().optional(),
  hairColor: z.string().optional(),
  eyeColor: z.string().optional(),
  recommendedColors: z.array(recommendedColorSchema).min(1),
  outfits: z
    .array(outfitSchema)
    .min(1)
    .max(5)
    .transform((outfits) => outfits.slice(0, 3)),
});

const noFaceSchema = z.object({
  error: z.literal("NO_FACE_DETECTED"),
});

function stripJsonFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

/** Pull the first balanced JSON object from mixed model output. */
function extractJsonObject(text: string): string | null {
  const cleaned = stripJsonFence(text);
  const start = cleaned.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i]!;

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }

  // Truncated JSON — attempt a light repair for common Gemini cutoffs.
  return tryRepairTruncatedJson(cleaned.slice(start));
}

function tryRepairTruncatedJson(fragment: string): string | null {
  let text = fragment.trim();
  if (!text.startsWith("{")) return null;

  // Drop a trailing incomplete string / key / value.
  text = text.replace(/,\s*"[^"]*$/s, "");
  text = text.replace(/,\s*\{[^}]*$/s, "");
  text = text.replace(/,\s*\[[^\]]*$/s, "");
  text = text.replace(/:\s*"[^"]*$/s, ': ""');
  text = text.replace(/,\s*$/s, "");

  // Close open brackets/braces outside strings (best-effort).
  let inString = false;
  let escape = false;
  const stack: string[] = [];
  for (const ch of text) {
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inString) text += '"';
  while (stack.length) text += stack.pop();

  try {
    JSON.parse(text);
    return text;
  } catch {
    return null;
  }
}

function coerceModelPayload(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return parsed;
  const record = parsed as Record<string, unknown>;

  // Some model variants nest under "result" / "data" / "analysis".
  for (const key of ["result", "data", "analysis", "colorAnalysis"]) {
    const nested = record[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const nestedRecord = nested as Record<string, unknown>;
      if (nestedRecord.outfits || nestedRecord.recommendedColors) {
        return nestedRecord;
      }
    }
  }

  // Alias common field renames.
  if (!record.recommendedColors && Array.isArray(record.colors)) {
    record.recommendedColors = record.colors;
  }
  if (!record.outfits && Array.isArray(record.looks)) {
    record.outfits = record.looks;
  }

  return record;
}

export function parseColorAnalysisResponse(
  rawText: string,
  fallbackOccasion: string,
): ColorAnalysisResult {
  const jsonText = extractJsonObject(rawText);
  if (!jsonText) {
    console.error("[color-analysis] no JSON object in model output:", rawText.slice(0, 400));
    throw new ColorAnalysisError("INVALID_JSON", COLOR_ANALYSIS_ERROR_MESSAGES.INVALID_JSON);
  }

  let parsed: unknown;
  try {
    parsed = coerceModelPayload(JSON.parse(jsonText));
  } catch {
    console.error("[color-analysis] invalid JSON from model:", jsonText.slice(0, 400));
    throw new ColorAnalysisError("INVALID_JSON", COLOR_ANALYSIS_ERROR_MESSAGES.INVALID_JSON);
  }

  const noFace = noFaceSchema.safeParse(parsed);
  if (noFace.success) {
    throw new ColorAnalysisError("NO_FACE", COLOR_ANALYSIS_ERROR_MESSAGES.NO_FACE);
  }

  const validated = colorAnalysisSchema.safeParse(parsed);
  if (!validated.success) {
    console.error(
      "[color-analysis] schema mismatch:",
      validated.error.message,
      JSON.stringify(parsed).slice(0, 800),
    );
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
      hex: color.hex,
      reason: color.reason,
    })),
    outfits: mapApiOutfitsToLooks(
      data.outfits.map((outfit) => ({
        ...outfit,
        occasion: outfit.occasion || fallbackOccasion,
        top: { ...outfit.top, hex: outfit.top.hex },
        bottom: { ...outfit.bottom, hex: outfit.bottom.hex },
      })),
      fallbackOccasion,
    ),
  };
}
