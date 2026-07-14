import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Look } from "@/lib/auth";
import type { ColorAnalysisResult } from "@/types/colorAnalysis";
import type { ProductGroups } from "@/services/productRecommendationService";
import {
  clearStudioSession,
  loadStudioSession,
  saveStudioSession,
  type StudioProductState,
  type StudioSession,
} from "@/lib/studioSession";

type StudioState = {
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

type StudioSetters = {
  setImage: Dispatch<SetStateAction<string | null>>;
  setGender: Dispatch<SetStateAction<string>>;
  setOccasion: Dispatch<SetStateAction<string>>;
  setStyle: Dispatch<SetStateAction<string>>;
  setMood: Dispatch<SetStateAction<string>>;
  setResults: Dispatch<SetStateAction<Look[]>>;
  setAnalysis: Dispatch<SetStateAction<ColorAnalysisResult | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setProductState: Dispatch<SetStateAction<StudioProductState>>;
  setProductError: Dispatch<SetStateAction<string | null>>;
  setProducts: Dispatch<SetStateAction<ProductGroups | null>>;
  clearSession: () => void;
};

export function usePersistedStudio(
  userId: string | undefined,
  defaults: Pick<StudioState, "gender" | "style" | "mood">,
): [StudioState, StudioSetters] {
  const [image, setImage] = useState<string | null>(null);
  const [gender, setGender] = useState(defaults.gender);
  const [occasion, setOccasion] = useState("Casual");
  const [style, setStyle] = useState(defaults.style);
  const [mood, setMood] = useState(defaults.mood);
  const [results, setResults] = useState<Look[]>([]);
  const [analysis, setAnalysis] = useState<ColorAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productState, setProductState] = useState<StudioProductState>("idle");
  const [productError, setProductError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductGroups | null>(null);

  const hydratedRef = useRef(false);
  const userIdRef = useRef(userId);

  useEffect(() => {
    if (!userId) {
      hydratedRef.current = false;
      return;
    }

    if (userIdRef.current !== userId) {
      hydratedRef.current = false;
      userIdRef.current = userId;
    }

    if (hydratedRef.current) return;

    const saved = loadStudioSession(userId);
    if (saved) {
      setImage(saved.image);
      setGender(saved.gender);
      setOccasion(saved.occasion);
      setStyle(saved.style);
      setMood(saved.mood);
      setResults(saved.results);
      setAnalysis(saved.analysis);
      setError(saved.error);
      setProductState(saved.productState === "loading" ? "idle" : saved.productState);
      setProductError(saved.productError);
      setProducts(saved.products);
    }

    hydratedRef.current = true;
  }, [userId]);

  useEffect(() => {
    if (!userId || !hydratedRef.current) return;

    const session: StudioSession = {
      image,
      gender,
      occasion,
      style,
      mood,
      results,
      analysis,
      error,
      productState: productState === "loading" ? "idle" : productState,
      productError,
      products,
    };

    saveStudioSession(userId, session);
  }, [
    userId,
    image,
    gender,
    occasion,
    style,
    mood,
    results,
    analysis,
    error,
    productState,
    productError,
    products,
  ]);

  const clearSession = () => {
    if (userId) clearStudioSession(userId);
    setImage(null);
    setResults([]);
    setAnalysis(null);
    setError(null);
    setProductState("idle");
    setProductError(null);
    setProducts(null);
  };

  return [
    {
      image,
      gender,
      occasion,
      style,
      mood,
      results,
      analysis,
      error,
      productState,
      productError,
      products,
    },
    {
      setImage,
      setGender,
      setOccasion,
      setStyle,
      setMood,
      setResults,
      setAnalysis,
      setError,
      setProductState,
      setProductError,
      setProducts,
      clearSession,
    },
  ];
}
