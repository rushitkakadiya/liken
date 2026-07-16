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
        temperature: 0.2,
        maxOutputTokens: 8192,
        ...(includeThinkingBudget
          ? {
              thinkingConfig: {
                thinkingBudget: 0,
              },
            }
          : {}),
      },
    });

  async function requestOnce(includeThinkingBudget: boolean) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": input.apiKey,
      },
      body: buildBody(includeThinkingBudget),
    });

    if (!response.ok) {
      const detail = await response.text();
      return { ok: false as const, status: response.status, detail, payload: null };
    }

    const payload = (await response.json()) as GeminiPayload;
    return { ok: true as const, status: response.status, detail: "", payload };
  }

  let result = await requestOnce(true);

  // Some API key/project variants reject thinkingConfig — retry without it.
  if (!result.ok && result.status === 400) {
    console.warn(
      "[color-analysis] retrying Gemini without thinkingConfig:",
      result.detail.slice(0, 240),
    );
    result = await requestOnce(false);
  }

  if (!result.ok || !result.payload) {
    console.error("[color-analysis] Gemini error:", result.status, result.detail.slice(0, 800));
    throw parseGeminiError(result.status, result.detail);
  }

  const payload = result.payload;

  if (payload.error?.message) {
    console.error("[color-analysis] Gemini payload error:", payload.error.message);
    throw parseGeminiError(result.status, payload.error.message);
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
  let text = extractGeminiText(payload);

  // One automatic retry when the model returns empty / truncated JSON.
  if (!text || finishReason === "MAX_TOKENS") {
    console.warn("[color-analysis] weak first response, retrying once", {
      finishReason,
      textLen: text.length,
    });
    const retry = await requestOnce(false);
    if (retry.ok && retry.payload) {
      const retryText = extractGeminiText(retry.payload);
      if (retryText) {
        text = retryText;
      }
    }
  }

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

  try {
    return parseColorAnalysisResponse(text, input.occasion);
  } catch (error) {
    if (!(error instanceof ColorAnalysisError) || error.code !== "INVALID_JSON") {
      throw error;
    }

    // Schema/parse miss — ask once more with a stricter JSON reminder.
    console.warn("[color-analysis] parse failed, requesting cleaner JSON once");
    const strictContents = [
      {
        parts: [
          {
            inline_data: {
              mime_type: input.mimeType || "image/jpeg",
              data: input.imageBase64,
            },
          },
          {
            text: `${prompt}

IMPORTANT: Your previous answer was invalid. Reply with ONE valid JSON object only — no markdown, no commentary.`,
          },
        ],
      },
    ];

    const strictResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": input.apiKey,
      },
      body: JSON.stringify({
        contents: strictContents,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!strictResponse.ok) throw error;
    const strictPayload = (await strictResponse.json()) as GeminiPayload;
    const strictText = extractGeminiText(strictPayload);
    if (!strictText) throw error;
    return parseColorAnalysisResponse(strictText, input.occasion);
  }
}

export async function getGeminiApiKey() {
  return (await getGeminiApiKeyFromSecrets()).trim();
}
