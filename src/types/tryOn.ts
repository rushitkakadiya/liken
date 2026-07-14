export type TryOnCategory = "top" | "bottom";

export type TryOnRequest = {
  userImageUrl: string;
  productImageUrl: string;
  productTitle: string;
  category: TryOnCategory;
  matchedColorName: string;
  matchedHex: string;
};

export type TryOnSuccessResponse = {
  success: true;
  generatedImageUrl: string;
  requestId: string;
  remainingTryOns: number;
};

export type TryOnErrorResponse = {
  success: false;
  error:
    | "PREMIUM_REQUIRED"
    | "UNAUTHORIZED"
    | "INVALID_REQUEST"
    | "MISSING_USER_IMAGE"
    | "MISSING_PRODUCT_IMAGE"
    | "PRODUCT_IMAGE_INACCESSIBLE"
    | "FAL_NOT_CONFIGURED"
    | "FAL_FAILED"
    | "INVALID_RESPONSE"
    | "TRYON_LIMIT_REACHED";
  message: string;
};

export type TryOnResponse = TryOnSuccessResponse | TryOnErrorResponse;
