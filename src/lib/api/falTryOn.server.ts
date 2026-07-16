import { fal } from "@fal-ai/client";
import type { TryOnCategory } from "@/types/tryOn";
import { getFalKeyFromSecrets } from "./secrets.server";

const BASE_PROMPT =
  "Edit the person's photo so they are realistically wearing the clothing item shown in the reference product image. Preserve the person's face, identity, skin tone, body shape, pose, lighting, and background as much as possible. Replace only the relevant clothing area with the selected garment. Match the garment color, style, texture, sleeves, collar, and overall appearance from the product image. Make the result look natural, realistic, and like a real fashion try-on preview. Do not change the person's face. Do not change the background. Do not add extra accessories. Do not distort the body.";

function buildTryOnPrompt(category: TryOnCategory) {
  const areaHint =
    category === "top"
      ? "Replace upper-body clothing only."
      : "Replace lower-body clothing only.";

  return `${BASE_PROMPT} ${areaHint}`;
}

async function getFalKey() {
  return (await getFalKeyFromSecrets()).trim();
}

function extensionForMime(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

function dataUrlToFile(dataUrl: string, filenameBase: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) {
    throw new Error("INVALID_USER_IMAGE");
  }

  const mimeType = (match[1] || "image/jpeg").trim() || "image/jpeg";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || "";

  let bytes: Uint8Array;
  if (isBase64) {
    const binary = atob(payload);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } else {
    const decoded = decodeURIComponent(payload);
    bytes = new TextEncoder().encode(decoded);
  }

  const ext = extensionForMime(mimeType);
  return new File([bytes], `${filenameBase}.${ext}`, { type: mimeType });
}

async function remoteImageToFile(imageUrl: string, filenameBase: string) {
  const response = await fetch(imageUrl, {
    headers: {
      // Some CDNs block empty/bot user-agents.
      "User-Agent": "liken-tryon/1.0",
      Accept: "image/*,*/*",
    },
  });

  if (!response.ok) {
    throw new Error("PRODUCT_IMAGE_INACCESSIBLE");
  }

  const mimeType = (response.headers.get("content-type") || "image/jpeg")
    .split(";")[0]!
    .trim();
  if (!mimeType.startsWith("image/")) {
    throw new Error("PRODUCT_IMAGE_INACCESSIBLE");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = extensionForMime(mimeType);
  return new File([buffer], `${filenameBase}.${ext}`, { type: mimeType });
}

/** Upload to fal storage so nano-banana always gets a clean https URL. */
async function toFalHostedUrl(imageUrl: string, filenameBase: string) {
  if (imageUrl.startsWith("data:")) {
    const file = dataUrlToFile(imageUrl, filenameBase);
    return fal.storage.upload(file);
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error("INVALID_IMAGE_URL");
  }

  // Always re-host product/CDN images — fal rejects many shopping CDN URL patterns.
  const file = await remoteImageToFile(imageUrl, filenameBase);
  return fal.storage.upload(file);
}

function extractFalErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "UNKNOWN";
  const message = error.message || "UNKNOWN";

  // fal / Zod often returns: "ValidationError: ... The string did not match the expected pattern"
  if (/did not match the expected pattern/i.test(message)) {
    return "IMAGE_URL_PATTERN";
  }

  return message;
}

export async function generateTryOnWithFal(input: {
  userImageUrl: string;
  productImageUrl: string;
  productTitle: string;
  category: TryOnCategory;
}) {
  const falKey = await getFalKey();
  if (!falKey) {
    throw new Error("FAL_NOT_CONFIGURED");
  }

  fal.config({ credentials: falKey });

  let userUrl: string;
  let productUrl: string;

  try {
    userUrl = await toFalHostedUrl(input.userImageUrl, "liken-user");
  } catch (error) {
    console.error("[try-on] user image upload failed", error);
    throw new Error("INVALID_USER_IMAGE");
  }

  try {
    productUrl = await toFalHostedUrl(input.productImageUrl, "liken-product");
  } catch (error) {
    console.error("[try-on] product image upload failed", error);
    throw new Error("PRODUCT_IMAGE_INACCESSIBLE");
  }

  const prompt = `${buildTryOnPrompt(input.category)} Product: ${input.productTitle}.`;

  try {
    const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
      input: {
        prompt,
        image_urls: [userUrl, productUrl],
        num_images: 1,
        output_format: "png",
        aspect_ratio: "auto",
        resolution: "1K",
      },
      logs: true,
    });

    const generatedImageUrl = result.data?.images?.[0]?.url;
    if (!generatedImageUrl) {
      throw new Error("INVALID_FAL_RESPONSE");
    }

    return { generatedImageUrl, requestId: result.requestId || "unknown" };
  } catch (error) {
    const detail = extractFalErrorMessage(error);
    console.error("[try-on] fal subscribe failed", detail, error);
    if (detail === "IMAGE_URL_PATTERN") {
      throw new Error("IMAGE_URL_PATTERN");
    }
    if (detail === "INVALID_FAL_RESPONSE") {
      throw new Error("INVALID_FAL_RESPONSE");
    }
    throw new Error("FAL_FAILED");
  }
}
