import type { Session } from "@supabase/supabase-js";
import type { DbProfile } from "@/types/database";
import type { User } from "@/lib/auth";
import { getSupabase } from "@/lib/supabaseClient";

export const DEFAULT_GENDER_PREF = "Unisex";
export const DEFAULT_STYLE_PREF = "Minimal";
export const DEFAULT_MOOD_PREF = "Natural";

export function isActivePremium(input: {
  plan: "Free" | "Premium";
  premium_expires_at?: string | null;
  premiumExpiresAt?: string;
}): boolean {
  if (input.plan !== "Premium") return false;
  const expiresAt = input.premium_expires_at ?? input.premiumExpiresAt;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

export function mapProfileToUser(profile: DbProfile): User {
  const premiumActive = isActivePremium(profile);

  return {
    id: profile.id,
    googleId: profile.google_id ?? undefined,
    name: profile.name,
    email: profile.email,
    credits: profile.credits,
    plan: premiumActive ? "Premium" : "Free",
    countryCode: profile.country_code ?? undefined,
    countryName: profile.country_name ?? undefined,
    profileImage: profile.profile_image ?? undefined,
    genderPref: profile.gender_pref ?? DEFAULT_GENDER_PREF,
    stylePref: profile.style_pref ?? DEFAULT_STYLE_PREF,
    moodPref: profile.mood_pref ?? DEFAULT_MOOD_PREF,
    looksGenerated: profile.looks_generated ?? 0,
    premiumStartedAt: profile.premium_started_at ?? undefined,
    premiumExpiresAt: profile.premium_expires_at ?? undefined,
    productSuggestionsUsed: profile.product_suggestions_used ?? 0,
    tryOnsUsed: profile.try_ons_used ?? 0,
  };
}

/** Only user-editable fields — plan/credits/usage are managed by RPCs. */
export function mapUserToProfileUpdate(user: User) {
  return {
    google_id: user.googleId ?? null,
    name: user.name,
    country_code: user.countryCode ?? null,
    country_name: user.countryName ?? null,
    gender_pref: user.genderPref ?? null,
    style_pref: user.stylePref ?? null,
    mood_pref: user.moodPref ?? null,
  };
}

function googleIdFromSession(session: Session): string | null {
  const meta = session.user.user_metadata;
  return meta.sub ?? meta.provider_id ?? null;
}

function nameFromSession(session: Session): string {
  const meta = session.user.user_metadata;
  return (
    meta.full_name ??
    meta.name ??
    session.user.email?.split("@")[0] ??
    "User"
  );
}

function avatarFromSession(session: Session): string | null {
  const meta = session.user.user_metadata;
  return meta.avatar_url ?? meta.picture ?? null;
}

export async function fetchProfile(userId: string): Promise<DbProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertProfileFromSession(session: Session): Promise<User> {
  const supabase = getSupabase();
  const userId = session.user.id;
  const email = session.user.email;

  if (!email) {
    throw new Error("Signed-in user is missing an email address.");
  }

  // Always keep Google avatar as the profile image (no custom uploads).
  const sessionFields = {
    google_id: googleIdFromSession(session),
    name: nameFromSession(session),
    email,
    profile_image: avatarFromSession(session),
  };

  const existing = await fetchProfile(userId);

  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update(sessionFields)
      .eq("id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      ...sessionFields,
      gender_pref: DEFAULT_GENDER_PREF,
      style_pref: DEFAULT_STYLE_PREF,
      mood_pref: DEFAULT_MOOD_PREF,
    });
    if (error) throw error;
  }

  const profile = await fetchProfile(userId);
  if (!profile) {
    throw new Error("Profile was not created after sign-in.");
  }

  return mapProfileToUser(profile);
}

export async function syncProfile(user: User): Promise<User> {
  if (!user.id) return user;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .update(mapUserToProfileUpdate(user))
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) throw error;
  return mapProfileToUser(data);
}
