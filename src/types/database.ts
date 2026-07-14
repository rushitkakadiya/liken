export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: DbProfile;
        Insert: DbProfileInsert;
        Update: DbProfileUpdate;
      };
      app_secrets: {
        Row: DbAppSecret;
        Insert: DbAppSecretInsert;
        Update: DbAppSecretUpdate;
      };
      saved_looks: {
        Row: DbSavedLook;
        Insert: DbSavedLookInsert;
        Update: DbSavedLookUpdate;
      };
      subscription_plans: {
        Row: DbSubscriptionPlan;
        Insert: DbSubscriptionPlanInsert;
        Update: DbSubscriptionPlanUpdate;
      };
      stripe_webhook_events: {
        Row: DbStripeWebhookEvent;
        Insert: DbStripeWebhookEventInsert;
        Update: DbStripeWebhookEventUpdate;
      };
    };
    Functions: {
      activate_premium_subscription: {
        Args: Record<string, never>;
        Returns: DbProfile;
      };
      sync_premium_from_stripe: {
        Args: {
          p_user_id: string;
          p_stripe_customer_id: string;
          p_stripe_subscription_id: string;
          p_period_start: string;
          p_period_end: string;
          p_reset_usage?: boolean;
        };
        Returns: DbProfile;
      };
      deactivate_premium_subscription: {
        Args: { p_user_id: string };
        Returns: DbProfile;
      };
      record_look_generated: {
        Args: Record<string, never>;
        Returns: DbProfile;
      };
      consume_product_suggestion: {
        Args: Record<string, never>;
        Returns: DbProfile;
      };
      consume_try_on: {
        Args: Record<string, never>;
        Returns: DbProfile;
      };
    };
  };
};

export type DbAppSecret = {
  key: string;
  value: string;
  updated_at: string;
};

export type DbAppSecretInsert = {
  key: string;
  value: string;
  updated_at?: string;
};

export type DbAppSecretUpdate = {
  value?: string;
  updated_at?: string;
};

export type DbProfile = {
  id: string;
  google_id: string | null;
  name: string;
  email: string;
  country_code: string | null;
  country_name: string | null;
  plan: "Free" | "Premium";
  credits: number;
  profile_image: string | null;
  gender_pref: string | null;
  style_pref: string | null;
  mood_pref: string | null;
  looks_generated: number;
  premium_started_at: string | null;
  premium_expires_at: string | null;
  product_suggestions_used: number;
  try_ons_used: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DbSubscriptionPlan = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  billing_interval: "month" | "year";
  product_suggestions_limit: number;
  try_ons_limit: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbSubscriptionPlanInsert = {
  id: string;
  name: string;
  price_cents: number;
  currency?: string;
  billing_interval?: "month" | "year";
  product_suggestions_limit?: number;
  try_ons_limit?: number;
  active?: boolean;
};

export type DbSubscriptionPlanUpdate = Partial<Omit<DbSubscriptionPlanInsert, "id">>;

export type DbStripeWebhookEvent = {
  id: string;
  type: string;
  processed_at: string;
};

export type DbStripeWebhookEventInsert = {
  id: string;
  type: string;
  processed_at?: string;
};

export type DbStripeWebhookEventUpdate = Partial<Omit<DbStripeWebhookEventInsert, "id">>;

export type DbProfileInsert = {
  id: string;
  google_id?: string | null;
  name: string;
  email: string;
  country_code?: string | null;
  country_name?: string | null;
  plan?: "Free" | "Premium";
  credits?: number;
  profile_image?: string | null;
  gender_pref?: string | null;
  style_pref?: string | null;
  mood_pref?: string | null;
  looks_generated?: number;
  premium_started_at?: string | null;
  premium_expires_at?: string | null;
  product_suggestions_used?: number;
  try_ons_used?: number;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

/** Client-editable profile fields only (plan/usage are managed by RPCs). */
export type DbProfileUpdate = {
  google_id?: string | null;
  name?: string;
  country_code?: string | null;
  country_name?: string | null;
  profile_image?: string | null;
  gender_pref?: string | null;
  style_pref?: string | null;
  mood_pref?: string | null;
};

export const PREMIUM_MONTHLY_LIMIT = 15;
export const FREE_MONTHLY_CREDITS = 3;

export type DbSavedLook = {
  id: string;
  user_id: string;
  occasion: string;
  score: number;
  explanation: string;
  top: string;
  bottom: string;
  shoes: string;
  top_color: string;
  bottom_color: string;
  shoes_color: string;
  top_color_name: string | null;
  bottom_color_name: string | null;
  shoes_color_name: string | null;
  top_color_family: string | null;
  bottom_color_family: string | null;
  shoes_color_family: string | null;
  created_at: string;
};

export type DbSavedLookInsert = {
  id?: string;
  user_id: string;
  occasion: string;
  score: number;
  explanation: string;
  top: string;
  bottom: string;
  shoes: string;
  top_color: string;
  bottom_color: string;
  shoes_color: string;
  top_color_name?: string | null;
  bottom_color_name?: string | null;
  shoes_color_name?: string | null;
  top_color_family?: string | null;
  bottom_color_family?: string | null;
  shoes_color_family?: string | null;
};

export type DbSavedLookUpdate = Partial<Omit<DbSavedLookInsert, "id" | "user_id">>;

export type DbProductRecommendation = {
  id: string;
  country: string;
  store: string;
  product_name: string;
  image: string;
  price: string;
  url: string;
};

export type DbTryOnHistory = {
  id: string;
  user_id: string;
  product_id: string;
  user_image: string;
  generated_image: string;
};
