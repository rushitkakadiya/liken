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
      "Gemini API key is invalid or expired. Check the gemini_api_key secret in Supabase.",
    );
  }
  return new ColorAnalysisError(
    "API_FAILED",
    COLOR_ANALYSIS_ERROR_MESSAGES.API_FAILED,
  );
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

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": input.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: input.mimeType || "image/jpeg",
                data: input.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[color-analysis] Gemini error:", response.status, detail.slice(0, 500));
    throw parseGeminiError(response.status, detail);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return parseColorAnalysisResponse(text, input.occasion);
}

export async function getGeminiApiKey() {
  return (await getGeminiApiKeyFromSecrets()).trim();
}
