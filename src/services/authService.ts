import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { markAuthReady, resetAuthInit, setUser } from "@/lib/auth";
import { upsertProfileFromSession } from "@/services/profileService";
import {
  buildAuthCallbackUrl,
  getMobileOAuthBlockReason,
  rememberOAuthNext,
  rememberOAuthOrigin,
  validateOAuthRedirectTarget,
} from "@/lib/appOrigin";

function clearAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.hash = "";
  window.history.replaceState({}, "", url.pathname + url.search);
}

export const authService = {
  isConfigured: isSupabaseConfigured,

  async signInWithGoogle(redirectTo = "/dashboard") {
    const blockReason = getMobileOAuthBlockReason();
    if (blockReason) {
      return { data: null, error: new Error(blockReason) };
    }

    const supabase = getSupabase();
    rememberOAuthOrigin();
    rememberOAuthNext(redirectTo);
    const callbackUrl = buildAuthCallbackUrl();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) return { data, error };

    if (!data?.url) {
      return {
        data,
        error: new Error("Could not start Google sign-in. Please try again."),
      };
    }

    const authUrl = new URL(data.url);
    const redirectParam = authUrl.searchParams.get("redirect_to") ?? callbackUrl;
    const validationError = validateOAuthRedirectTarget(decodeURIComponent(redirectParam));
    if (validationError) {
      return { data, error: new Error(validationError) };
    }

    window.location.assign(data.url);
    return { data, error: null };
  },

  async handleAuthCallback() {
    const supabase = getSupabase();
    let { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (!data.session) {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        ({ data, error } = await supabase.auth.getSession());
        if (error) throw error;
      }
    }

    if (!data.session) {
      throw new Error("No session found after Google sign-in.");
    }

    const user = await upsertProfileFromSession(data.session);
    setUser(user);
    markAuthReady();
    clearAuthParamsFromUrl();
    return user;
  },

  async signOut() {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    setUser(null);
    markAuthReady();
    clearAuthParamsFromUrl();
    resetAuthInit();
  },

  async getSession() {
    const supabase = getSupabase();
    return supabase.auth.getSession();
  },
};
