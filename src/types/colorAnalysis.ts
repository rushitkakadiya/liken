import type { Look } from "@/lib/auth";

export type RecommendedColor = {
  colorFamily: string;
  colorName: string;
  hex: string;
  reason: string;
};

export type ColorAnalysisResult = {
  skinTone: string;
  undertone: string;
  contrastLevel?: string;
  hairColor?: string;
  eyeColor?: string;
  recommendedColors: RecommendedColor[];
  outfits: Look[];
};

export type AnalyzeStyleInput = {
  imageFile: File;
  gender: string;
  occasion: string;
  stylePreference: string;
  colorMood: string;
  outfitCount?: number;
};

export type ColorAnalysisErrorCode =
  | "NO_IMAGE"
  | "NO_FACE"
  | "API_FAILED"
  | "INVALID_JSON"
  | "UNAUTHORIZED";

export class ColorAnalysisError extends Error {
  code: ColorAnalysisErrorCode;

  constructor(code: ColorAnalysisErrorCode, message: string) {
    super(message);
    this.name = "ColorAnalysisError";
    this.code = code;
  }
}

export const COLOR_ANALYSIS_ERROR_MESSAGES: Record<ColorAnalysisErrorCode, string> = {
  NO_IMAGE: "Please upload a clear photo of yourself before generating outfit suggestions.",
  NO_FACE: "We couldn't detect a person or face in your photo. Try a clearer upper-body image.",
  API_FAILED: "Color analysis failed. Please try again in a moment.",
  INVALID_JSON: "We received an unexpected response from the styling engine. Please try again.",
  UNAUTHORIZED: "Sign in to generate outfit colors.",
};
