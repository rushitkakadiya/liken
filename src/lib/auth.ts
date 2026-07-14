import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  fetchProfile,
  mapProfileToUser,
  syncProfile,
  upsertProfileFromSession,
} from "@/services/profileService";
import {
  fetchSavedLooks,
  insertSavedLook,
  removeSavedLook,
} from "@/services/savedLooksService";
import { enrichLookColorNames } from "@/lib/lookColors";
import { clearStudioSession } from "@/lib/studioSession";

export type User = {
  id?: string;
  googleId?: string;
  name: string;
  email: string;
  credits: number;
  plan: "Free" | "Premium";
  countryCode?: string;
  countryName?: string;
  profileImage?: string;
  genderPref?: string;
  stylePref?: string;
  moodPref?: string;
  looksGenerated?: number;
  premiumStartedAt?: string;
  premiumExpiresAt?: string;
  productSuggestionsUsed?: number;
  tryOnsUsed?: number;
};

const USER_KEY = "sm_user";

let authReady = false;
const authReadyListeners = new Set<() => void>();

function setAuthReady(ready: boolean) {
  authReady = ready;
  authReadyListeners.forEach((listener) => listener());
}

export function useAuthReady() {
  const [ready, setReady] = useState(() => authReady);
  useEffect(() => {
    setReady(authReady);
    const listener = () => setReady(authReady);
    authReadyListeners.add(listener);
    return () => {
      authReadyListeners.delete(listener);
    };
  }, []);
  return ready;
}

export function markAuthReady() {
  setAuthReady(true);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(USER_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function setUser(u: User | null) {
  if (typeof window === "undefined") return;
  if (u) {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  } else {
    const prev = getUser();
    if (prev?.id) clearStudioSession(prev.id);
    localStorage.removeItem(USER_KEY);
  }
  window.dispatchEvent(new Event("sm_user_change"));
  if (!u) window.dispatchEvent(new Event("sm_looks_change"));
}

export function updateUser(patch: Partial<User>) {
  const current = getUser();
  if (!current) return;
  const updated = { ...current, ...patch };
  setUser(updated);

  if (current.id && isSupabaseConfigured()) {
    void syncProfile(updated).catch((err) => {
      console.error("Failed to sync profile:", err);
    });
  }
}

export async function updateUserAsync(patch: Partial<User>): Promise<User | null> {
  const current = getUser();
  if (!current) return null;

  const updated = { ...current, ...patch };
  setUser(updated);

  if (current.id && isSupabaseConfigured()) {
    const synced = await syncProfile(updated);
    setUser(synced);
    return synced;
  }

  return updated;
}

export function useUser() {
  const [user, setU] = useState<User | null>(() =>
    typeof window !== "undefined" ? getUser() : null,
  );
  useEffect(() => {
    setU(getUser());
    const h = () => setU(getUser());
    window.addEventListener("sm_user_change", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("sm_user_change", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return user;
}

export function isPremium(u: User | null): boolean {
  if (!u || u.plan !== "Premium" || !u.premiumExpiresAt) return false;
  return new Date(u.premiumExpiresAt).getTime() > Date.now();
}

let initAuthPromise: Promise<void> | null = null;
let authListenerRegistered = false;

export async function initAuth(): Promise<void> {
  if (initAuthPromise) return initAuthPromise;
  initAuthPromise = runInitAuth();
  return initAuthPromise;
}

export function resetAuthInit() {
  initAuthPromise = null;
}

async function hydrateUserFromSession(supabase: ReturnType<typeof getSupabase>) {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    const profile = await fetchProfile(data.session.user.id);
    if (profile) {
      setUser(mapProfileToUser(profile));
    } else {
      setUser(await upsertProfileFromSession(data.session));
    }
  } else {
    setUser(null);
  }
}

async function runInitAuth(): Promise<void> {
  if (typeof window === "undefined") {
    setAuthReady(true);
    return;
  }

  if (!isSupabaseConfigured()) {
    setAuthReady(true);
    return;
  }

  const supabase = getSupabase();

  try {
    const code = new URLSearchParams(window.location.search).get("code");
    const onCallback = window.location.pathname === "/auth/callback";

    // OAuth code is exchanged on /auth/callback only — avoid double exchange races
    if (code && !onCallback) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
    }

    await hydrateUserFromSession(supabase);
  } catch (err) {
    console.error("Auth init failed:", err);
    try {
      await hydrateUserFromSession(supabase);
    } catch {
      setUser(null);
    }
  } finally {
    if (!authListenerRegistered) {
      authListenerRegistered = true;
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setAuthReady(true);
          return;
        }

        if (
          session &&
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")
        ) {
          try {
            const profile = await fetchProfile(session.user.id);
            if (profile) {
              setUser(mapProfileToUser(profile));
            } else {
              setUser(await upsertProfileFromSession(session));
            }
          } catch (err) {
            console.error("Failed to refresh profile:", err);
          }
        }
        setAuthReady(true);
      });
    }

    setAuthReady(true);
  }
}

export type Look = {
  id: string;
  top: string;
  bottom: string;
  occasion: string;
  score: number;
  explanation: string;
  topColor: string;
  bottomColor: string;
  topColorName?: string;
  bottomColorName?: string;
  topColorFamily?: string;
  bottomColorFamily?: string;
  /** @deprecated Footwear is no longer part of outfit recommendations. Kept for older saved looks. */
  shoes?: string;
  shoesColor?: string;
  shoesColorName?: string;
  shoesColorFamily?: string;
  createdAt: number;
};

export async function saveLookAsync(look: Look): Promise<Look> {
  const user = getUser();
  if (!user?.id) {
    throw new Error("Sign in to save looks.");
  }

  const saved = await insertSavedLook(user.id, enrichLookColorNames(look));
  window.dispatchEvent(new Event("sm_looks_change"));
  return saved;
}

export async function deleteLookAsync(lookId: string): Promise<void> {
  const user = getUser();
  if (!user?.id) {
    throw new Error("Sign in to manage saved looks.");
  }

  await removeSavedLook(user.id, lookId);
  window.dispatchEvent(new Event("sm_looks_change"));
}

export function useLooks() {
  const user = useUser();
  const [looks, setLooks] = useState<Look[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setLooks([]);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const data = await fetchSavedLooks(user.id!);
        if (active) setLooks(data);
      } catch (err) {
        console.error("Failed to load saved looks:", err);
        if (active) setLooks([]);
      }
    };

    void load();

    const onChange = () => {
      void load();
    };

    window.addEventListener("sm_looks_change", onChange);
    return () => {
      active = false;
      window.removeEventListener("sm_looks_change", onChange);
    };
  }, [user?.id]);

  return looks;
}
