import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ColorAnalysisErrorCode, ColorAnalysisResult } from "@/types/colorAnalysis";
import {
  ColorAnalysisError,
  COLOR_ANALYSIS_ERROR_MESSAGES,
} from "@/types/colorAnalysis";
import { generateMockColorAnalysis } from "@/services/colorAnalysisMock";
import {
  assertCanGenerateLook,
  recordLookGeneratedOnServer,
} from "@/lib/supabase.server";
import type { DbProfile } from "@/types/database";
import { analyzeImageWithGemini, getGeminiApiKey } from "./gemini.server";

const analyzeInputSchema = z.object({
  accessToken: z.string().min(1),
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1),
  gender: z.string().min(1),
  occasion: z.string().min(1),
  stylePreference: z.string().min(1),
  colorMood: z.string().min(1),
  outfitCount: z.number().int().min(1).max(5).optional(),
});

export type AnalyzeColorResponse =
  | { ok: true; data: ColorAnalysisResult; profile: DbProfile }
  | { ok: false; code: ColorAnalysisErrorCode; message: string };

export const analyzeColorWithAI = createServerFn({ method: "POST" })
  .inputValidator(analyzeInputSchema)
  .handler(async ({ data }): Promise<AnalyzeColorResponse> => {
    const canGenerate = await assertCanGenerateLook(data.accessToken);
    if (!canGenerate.ok) {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        message: COLOR_ANALYSIS_ERROR_MESSAGES.UNAUTHORIZED,
      };
    }

    const apiKey = await getGeminiApiKey();
    const outfitCount = data.outfitCount ?? 3;

    let result: ColorAnalysisResult;

    if (!apiKey) {
      result = generateMockColorAnalysis({
        occasion: data.occasion,
        outfitCount,
      });
    } else {
      try {
        result = await analyzeImageWithGemini({
          apiKey,
          imageBase64: data.imageBase64,
          mimeType: data.mimeType,
          gender: data.gender,
          occasion: data.occasion,
          stylePreference: data.stylePreference,
          colorMood: data.colorMood,
        });
      } catch (error) {
        if (error instanceof ColorAnalysisError) {
          console.error("[color-analysis]", error.code, error.message);
          return { ok: false, code: error.code, message: error.message };
        }

        console.error("[color-analysis] unexpected error:", error);
        return {
          ok: false,
          code: "API_FAILED",
          message: COLOR_ANALYSIS_ERROR_MESSAGES.API_FAILED,
        };
      }
    }

    const recorded = await recordLookGeneratedOnServer(data.accessToken);
    if (!recorded.ok) {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        message: COLOR_ANALYSIS_ERROR_MESSAGES.UNAUTHORIZED,
      };
    }

    return { ok: true, data: result, profile: recorded.profile };
  });
