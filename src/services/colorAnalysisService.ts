import { analyzeColorWithAI } from "@/lib/api/colorAnalysis.functions";
import { setUser } from "@/lib/auth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { AnalyzeStyleInput, ColorAnalysisResult } from "@/types/colorAnalysis";
import {
  ColorAnalysisError,
  COLOR_ANALYSIS_ERROR_MESSAGES,
} from "@/types/colorAnalysis";
import { mapProfileToUser } from "@/services/profileService";
import { fileToAnalysisImage } from "./colorAnalysisMappers";

export type { AnalyzeStyleInput, ColorAnalysisResult, ColorAnalysisErrorCode } from "@/types/colorAnalysis";
export { ColorAnalysisError, COLOR_ANALYSIS_ERROR_MESSAGES } from "@/types/colorAnalysis";
export { dataUrlToFile } from "./colorAnalysisMappers";

async function getAccessToken() {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.access_token) {
    return sessionData.session.access_token;
  }
  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? null;
}

export async function analyzeStyleFromImage(input: AnalyzeStyleInput): Promise<ColorAnalysisResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ColorAnalysisError("UNAUTHORIZED", COLOR_ANALYSIS_ERROR_MESSAGES.UNAUTHORIZED);
  }

  if (!input.imageFile || input.imageFile.size === 0) {
    throw new ColorAnalysisError("NO_IMAGE", COLOR_ANALYSIS_ERROR_MESSAGES.NO_IMAGE);
  }

  let imageBase64: string;
  let mimeType: string;
  try {
    const prepared = await fileToAnalysisImage(input.imageFile);
    imageBase64 = prepared.base64;
    mimeType = prepared.mimeType;
  } catch {
    throw new ColorAnalysisError("NO_IMAGE", COLOR_ANALYSIS_ERROR_MESSAGES.NO_IMAGE);
  }

  // Keep server payloads well under Vercel body limits.
  if (imageBase64.length > 6_000_000) {
    throw new ColorAnalysisError(
      "API_FAILED",
      "Photo is too large for analysis. Try a smaller or more compressed image.",
    );
  }

  let response: Awaited<ReturnType<typeof analyzeColorWithAI>>;
  try {
    response = await analyzeColorWithAI({
      data: {
        accessToken,
        imageBase64,
        mimeType,
        gender: input.gender,
        occasion: input.occasion,
        stylePreference: input.stylePreference,
        colorMood: input.colorMood,
        outfitCount: input.outfitCount,
      },
    });
  } catch (error) {
    console.error("[color-analysis] client request failed:", error);
    throw new ColorAnalysisError(
      "API_FAILED",
      error instanceof Error && error.message
        ? error.message
        : COLOR_ANALYSIS_ERROR_MESSAGES.API_FAILED,
    );
  }

  if (!response.ok) {
    throw new ColorAnalysisError(response.code, response.message);
  }

  setUser(mapProfileToUser(response.profile));
  return response.data;
}
