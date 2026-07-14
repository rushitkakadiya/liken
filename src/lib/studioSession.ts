import type { Look } from "@/lib/auth";
import type { ColorAnalysisResult } from "@/types/colorAnalysis";
import type { ProductGroups } from "@/services/productRecommendationService";

export type StudioProductState = "idle" | "loading" | "success" | "empty" | "error";

export type StudioSession = {
  image: string | null;
  gender: string;
  occasion: string;
  style: string;
  mood: string;
  results: Look[];
  analysis: ColorAnalysisResult | null;
  error: string | null;
  productState: StudioProductState;
  productError: string | null;
  products: ProductGroups | null;
};

const SESSION_PREFIX = "sm_studio_";

function sessionKey(userId: string) {
  return `${SESSION_PREFIX}${userId}`;
}

export function loadStudioSession(userId: string): StudioSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(sessionKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as StudioSession;
  } catch {
    return null;
  }
}

export function saveStudioSession(userId: string, session: StudioSession) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(sessionKey(userId), JSON.stringify(session));
  } catch (err) {
    if (session.image) {
      try {
        sessionStorage.setItem(
          sessionKey(userId),
          JSON.stringify({ ...session, image: null }),
        );
      } catch {
        console.warn("Could not persist studio session:", err);
      }
    }
  }
}

export function clearStudioSession(userId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(sessionKey(userId));
}
