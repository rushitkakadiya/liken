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

function dataUrlToBlob(dataUrl: string) {
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
    bytes = new TextEncoder().encode(decodeURIComponent(payload));
  }

  return { blob: new Blob([bytes], { type: mimeType }), mimeType };
}

async function remoteImageToBlob(imageUrl: string) {
  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; liken-tryon/1.0)",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: "https://www.google.com/",
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
  if (buffer.byteLength < 32) {
    throw new Error("PRODUCT_IMAGE_INACCESSIBLE");
  }

  return { blob: new Blob([buffer], { type: mimeType }), mimeType };
}

async function uploadBlobToFal(blob: Blob, filenameBase: string) {
  const ext = extensionForMime(blob.type || "image/jpeg");
  const file = new File([blob], `${filenameBase}.${ext}`, {
    type: blob.type || "image/jpeg",
  });
  const uploaded = await fal.storage.upload(file);
  if (typeof uploaded !== "string" || !/^https?:\/\//i.test(uploaded)) {
    throw new Error("FAL_UPLOAD_FAILED");
  }
  return uploaded;
}

/** Always re-host on fal so nano-banana gets clean https URLs. */
async function toFalHostedUrl(imageUrl: string, filenameBase: string) {
  if (imageUrl.startsWith("data:")) {
    const { blob } = dataUrlToBlob(imageUrl);
    return uploadBlobToFal(blob, filenameBase);
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error("INVALID_IMAGE_URL");
  }

  const { blob } = await remoteImageToBlob(imageUrl);
  return uploadBlobToFal(blob, filenameBase);
}

function extractFalDetail(error: unknown): string {
  if (!error || typeof error !== "object") {
    return error instanceof Error ? error.message : "UNKNOWN";
  }

  const record = error as {
    message?: string;
    body?: { detail?: Array<{ msg?: string }> | string };
  };

  const detail = record.body?.detail;
  if (Array.isArray(detail) && detail[0]?.msg) {
    return detail.map((item) => item.msg).filter(Boolean).join("; ");
  }
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return record.message || "UNKNOWN";
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
    console.error("[try-on] user image upload failed", extractFalDetail(error), error);
    throw new Error("INVALID_USER_IMAGE");
  }

  try {
    productUrl = await toFalHostedUrl(input.productImageUrl, "liken-product");
  } catch (error) {
    console.error("[try-on] product image upload failed", extractFalDetail(error), error);
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
    if (!generatedImageUrl || !/^https?:\/\//i.test(generatedImageUrl)) {
      throw new Error("INVALID_FAL_RESPONSE");
    }

    return { generatedImageUrl, requestId: result.requestId || "unknown" };
  } catch (error) {
    const detail = extractFalDetail(error);
    console.error("[try-on] fal subscribe failed", detail, error);

    if (/pattern|invalid url|image_urls|scheme/i.test(detail)) {
      throw new Error("IMAGE_URL_PATTERN");
    }
    if (detail === "INVALID_FAL_RESPONSE") {
      throw new Error("INVALID_FAL_RESPONSE");
    }
    throw new Error("FAL_FAILED");
  }
}
