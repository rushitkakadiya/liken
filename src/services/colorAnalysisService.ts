import { analyzeColorWithAI } from "@/lib/api/colorAnalysis.functions";
import { setUser } from "@/lib/auth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { AnalyzeStyleInput, ColorAnalysisResult } from "@/types/colorAnalysis";
import {
  ColorAnalysisError,
  COLOR_ANALYSIS_ERROR_MESSAGES,
} from "@/types/colorAnalysis";
import { mapProfileToUser } from "@/services/profileService";
import { fileToBase64 } from "./colorAnalysisMappers";

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
  try {
    imageBase64 = await fileToBase64(input.imageFile);
  } catch {
    throw new ColorAnalysisError("NO_IMAGE", COLOR_ANALYSIS_ERROR_MESSAGES.NO_IMAGE);
  }

  const response = await analyzeColorWithAI({
    data: {
      accessToken,
      imageBase64,
      mimeType: input.imageFile.type || "image/jpeg",
      gender: input.gender,
      occasion: input.occasion,
      stylePreference: input.stylePreference,
      colorMood: input.colorMood,
      outfitCount: input.outfitCount,
    },
  });

  if (!response.ok) {
    throw new ColorAnalysisError(response.code, response.message);
  }

  setUser(mapProfileToUser(response.profile));
  return response.data;
}
