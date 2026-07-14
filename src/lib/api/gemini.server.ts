import { buildColorAnalysisPrompt } from "./colorAnalysisPrompt";
import { parseColorAnalysisResponse } from "./colorAnalysisParser";
import { ColorAnalysisError, COLOR_ANALYSIS_ERROR_MESSAGES } from "@/types/colorAnalysis";
import { getGeminiApiKeyFromSecrets } from "./secrets.server";

const GEMINI_MODEL = "gemini-2.5-flash";

function parseGeminiError(status: number, detail: string) {
  if (status === 429 || detail.includes("RESOURCE_EXHAUSTED") || detail.includes("quota")) {
    return new ColorAnalysisError(
      "API_FAILED",
      "Gemini API daily quota exceeded. Wait a few minutes or upgrade your Google AI plan, then try again.",
    );
  }
  if (status === 401 || status === 403 || detail.includes("API key not valid")) {
    return new ColorAnalysisError(
      "API_FAILED",
      "Gemini API key is invalid or expired. Check the gemini_api_key secret in Supabase (or GEMINI_API_KEY on Vercel).",
    );
  }
  if (status === 413 || detail.toLowerCase().includes("too large") || detail.includes("Request payload")) {
    return new ColorAnalysisError(
      "API_FAILED",
      "Photo is too large for analysis. Try a smaller or more compressed image.",
    );
  }
  return new ColorAnalysisError(
    "API_FAILED",
    COLOR_ANALYSIS_ERROR_MESSAGES.API_FAILED,
  );
}

type GeminiPart = {
  text?: string;
  thought?: boolean;
};

type GeminiPayload = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
    status?: string;
  };
};

function extractGeminiText(payload: GeminiPayload) {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part) => !part.thought && typeof part.text === "string" && part.text.trim())
    .map((part) => part.text!.trim())
    .join("\n")
    .trim();
  return text;
}

export async function analyzeImageWithGemini(input: {
  apiKey: string;
  imageBase64: string;
  mimeType: string;
  gender: string;
  occasion: string;
  stylePreference: string;
  colorMood: string;
}) {
  const prompt = buildColorAnalysisPrompt(input);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const contents = [
    {
      parts: [
        {
          inline_data: {
            mime_type: input.mimeType || "image/jpeg",
            data: input.imageBase64,
          },
        },
        { text: prompt },
      ],
    },
  ];

  const buildBody = (includeThinkingBudget: boolean) =>
    JSON.stringify({
      contents,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
        ...(includeThinkingBudget
          ? {
              thinkingConfig: {
                thinkingBudget: 0,
              },
            }
          : {}),
      },
    });

  let response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": input.apiKey,
    },
    body: buildBody(true),
  });

  // Some API key/project variants reject thinkingConfig — retry without it.
  if (!response.ok && response.status === 400) {
    const firstError = await response.text();
    console.warn("[color-analysis] retrying Gemini without thinkingConfig:", firstError.slice(0, 240));
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": input.apiKey,
      },
      body: buildBody(false),
    });
  }
  if (!response.ok) {
    const detail = await response.text();
    console.error("[color-analysis] Gemini error:", response.status, detail.slice(0, 800));
    throw parseGeminiError(response.status, detail);
  }

  const payload = (await response.json()) as GeminiPayload;

  if (payload.error?.message) {
    console.error("[color-analysis] Gemini payload error:", payload.error.message);
    throw parseGeminiError(response.status, payload.error.message);
  }

  const blockReason = payload.promptFeedback?.blockReason;
  if (blockReason) {
    console.error("[color-analysis] prompt blocked:", blockReason);
    throw new ColorAnalysisError(
      "API_FAILED",
      "This photo was blocked by the safety filter. Try a different clear selfie photo.",
    );
  }

  const finishReason = payload.candidates?.[0]?.finishReason;
  const text = extractGeminiText(payload);

  if (!text) {
    console.error(
      "[color-analysis] empty Gemini response",
      JSON.stringify({
        finishReason,
        candidateCount: payload.candidates?.length ?? 0,
        parts: payload.candidates?.[0]?.content?.parts?.map((part) => ({
          thought: part.thought ?? false,
          hasText: Boolean(part.text),
        })),
      }).slice(0, 800),
    );

    if (finishReason === "SAFETY" || finishReason === "BLOCKLIST" || finishReason === "PROHIBITED_CONTENT") {
      throw new ColorAnalysisError(
        "API_FAILED",
        "This photo was blocked by the safety filter. Try a different clear selfie photo.",
      );
    }

    throw new ColorAnalysisError(
      "API_FAILED",
      "Color analysis returned an empty response. Please try again with a clearer photo.",
    );
  }

  return parseColorAnalysisResponse(text, input.occasion);
}

export async function getGeminiApiKey() {
  return (await getGeminiApiKeyFromSecrets()).trim();
}
