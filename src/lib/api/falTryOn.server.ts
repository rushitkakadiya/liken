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

function dataUrlToBlob(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

async function ensureAccessibleImageUrl(imageUrl: string, falKey: string) {
  if (imageUrl.startsWith("data:")) {
    fal.config({ credentials: falKey });
    const blob = dataUrlToBlob(imageUrl);
    return fal.storage.upload(blob);
  }

  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    throw new Error("INVALID_IMAGE_URL");
  }

  return imageUrl;
}

async function verifyRemoteImageAccessible(imageUrl: string) {
  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    if (response.ok) return true;

    const getResponse = await fetch(imageUrl, { method: "GET" });
    return getResponse.ok;
  } catch {
    return false;
  }
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

  const userUrl = await ensureAccessibleImageUrl(input.userImageUrl, falKey);

  const productAccessible = await verifyRemoteImageAccessible(input.productImageUrl);
  if (!productAccessible) {
    throw new Error("PRODUCT_IMAGE_INACCESSIBLE");
  }

  const prompt = `${buildTryOnPrompt(input.category)} Product: ${input.productTitle}.`;

  const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
    input: {
      prompt,
      image_urls: [userUrl, input.productImageUrl],
      num_images: 1,
      output_format: "png",
      aspect_ratio: "auto",
    },
    logs: true,
  });

  const generatedImageUrl = result.data?.images?.[0]?.url;
  if (!generatedImageUrl) {
    throw new Error("INVALID_FAL_RESPONSE");
  }

  return { generatedImageUrl, requestId: result.requestId || "unknown" };
}
