import Stripe from "stripe";
import { getAppSecret } from "@/lib/api/secrets.server";
import { getSupabaseServiceClient } from "@/lib/supabaseService.server";
import { getPremiumSubscriptionPlan, PREMIUM_PLAN_ID } from "@/lib/api/subscriptionPlans.server";
import type { DbSubscriptionPlan } from "@/types/database";

let stripeClient: Stripe | null = null;

export async function getStripeClient() {
  if (stripeClient) return stripeClient;

  const secretKey = await getAppSecret("stripe_secret_key");
  if (!secretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export async function getStripePublishableKey() {
  return getAppSecret("stripe_publishable_key");
}

export async function getStripeWebhookSecret() {
  return getAppSecret("stripe_webhook_secret");
}

function getAppOrigin(request: Request) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const origin = request.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");

  return "http://localhost:8080";
}

export async function createPremiumCheckoutSession(input: {
  request: Request;
  userId: string;
  email: string;
  stripeCustomerId?: string | null;
}) {
  const stripe = await getStripeClient();
  const plan = await getPremiumSubscriptionPlan();
  if (!plan) {
    throw new Error("Premium subscription plan is not configured.");
  }

  const origin = getAppOrigin(input.request);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: input.stripeCustomerId ?? undefined,
    customer_email: input.stripeCustomerId ? undefined : input.email,
    client_reference_id: input.userId,
    metadata: {
      userId: input.userId,
      planId: plan.id,
    },
    subscription_data: {
      metadata: {
        userId: input.userId,
        planId: plan.id,
      },
    },
    line_items: [
      {
        price_data: buildStripePriceData(plan),
        quantity: 1,
      },
    ],
    success_url: `${origin}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=cancel`,
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return session;
}

function buildStripePriceData(plan: DbSubscriptionPlan): Stripe.Checkout.SessionCreateParams.LineItem.PriceData {
  // Always charge Premium in USD, regardless of Stripe account country or legacy DB values.
  return {
    currency: "usd",
    unit_amount: plan.price_cents,
    recurring: {
      interval: plan.billing_interval,
    },
    product_data: {
      name: plan.name,
      metadata: {
        planId: plan.id,
      },
    },
  };
}

type LegacySubscription = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

function stripeUnixToDate(unixSeconds?: number | null) {
  if (typeof unixSeconds !== "number" || !Number.isFinite(unixSeconds)) {
    return null;
  }
  const date = new Date(unixSeconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getSubscriptionBillingPeriod(subscription: Stripe.Subscription) {
  const items = subscription.items?.data ?? [];
  let periodStartUnix: number | undefined;
  let periodEndUnix: number | undefined;

  for (const item of items) {
    if (typeof item.current_period_start === "number") {
      periodStartUnix =
        periodStartUnix === undefined
          ? item.current_period_start
          : Math.min(periodStartUnix, item.current_period_start);
    }
    if (typeof item.current_period_end === "number") {
      periodEndUnix =
        periodEndUnix === undefined
          ? item.current_period_end
          : Math.max(periodEndUnix, item.current_period_end);
    }
  }

  const legacy = subscription as LegacySubscription;
  if (periodStartUnix === undefined && typeof legacy.current_period_start === "number") {
    periodStartUnix = legacy.current_period_start;
  }
  if (periodEndUnix === undefined && typeof legacy.current_period_end === "number") {
    periodEndUnix = legacy.current_period_end;
  }

  let periodStart =
    stripeUnixToDate(periodStartUnix) ??
    stripeUnixToDate(subscription.billing_cycle_anchor) ??
    stripeUnixToDate(subscription.created);

  let periodEnd = stripeUnixToDate(periodEndUnix);

  if (periodStart && !periodEnd) {
    periodEnd = addMonths(periodStart, 1);
  }

  if (!periodStart || !periodEnd) {
    const now = new Date();
    return { periodStart: now, periodEnd: addMonths(now, 1) };
  }

  return { periodStart, periodEnd };
}

async function retrieveSubscriptionWithItems(stripe: Stripe, subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data"],
  });
}

async function markWebhookProcessed(eventId: string, eventType: string) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("stripe_webhook_events").insert({
    id: eventId,
    type: eventType,
  });

  if (error && !error.message.includes("duplicate")) {
    throw error;
  }
}

async function wasWebhookProcessed(eventId: string) {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  return !!data;
}

async function syncPremiumProfile(input: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  resetUsage: boolean;
}) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.rpc("sync_premium_from_stripe", {
    p_user_id: input.userId,
    p_stripe_customer_id: input.customerId,
    p_stripe_subscription_id: input.subscriptionId,
    p_period_start: input.periodStart.toISOString(),
    p_period_end: input.periodEnd.toISOString(),
    p_reset_usage: input.resetUsage,
  });

  if (!error) return;

  const rpcMissing =
    error.message.includes("Could not find the function") ||
    error.message.includes("sync_premium_from_stripe") ||
    error.code === "42883";

  if (!rpcMissing) {
    throw new Error(error.message);
  }

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("premium_started_at, product_suggestions_used, try_ons_used")
    .eq("id", input.userId)
    .maybeSingle();

  if (readError || !existing) {
    throw new Error(readError?.message ?? "Profile not found.");
  }

  const updatePayload: Record<string, unknown> = {
    plan: "Premium",
    stripe_customer_id: input.customerId,
    stripe_subscription_id: input.subscriptionId,
    premium_started_at: existing.premium_started_at ?? input.periodStart.toISOString(),
    premium_expires_at: input.periodEnd.toISOString(),
  };

  if (input.resetUsage) {
    updatePayload.product_suggestions_used = 0;
    updatePayload.try_ons_used = 0;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", input.userId);

  if (!updateError) return;

  const missingStripeColumns =
    updateError.message.includes("stripe_customer_id") ||
    updateError.message.includes("stripe_subscription_id");

  if (!missingStripeColumns) {
    throw new Error(updateError.message);
  }

  const { error: fallbackError } = await supabase
    .from("profiles")
    .update({
      plan: "Premium",
      premium_started_at: existing.premium_started_at ?? input.periodStart.toISOString(),
      premium_expires_at: input.periodEnd.toISOString(),
      ...(input.resetUsage ? { product_suggestions_used: 0, try_ons_used: 0 } : {}),
    })
    .eq("id", input.userId);

  if (fallbackError) {
    throw new Error(fallbackError.message);
  }
}

function sessionBelongsToUser(session: Stripe.Checkout.Session, userId: string) {
  const sessionUserId = session.client_reference_id ?? session.metadata?.userId;
  return sessionUserId === userId;
}

function isCheckoutSessionComplete(session: Stripe.Checkout.Session) {
  if (session.payment_status === "paid") return true;
  if (session.status === "complete") return true;

  const subscription = session.subscription;
  if (subscription && typeof subscription !== "string") {
    return subscription.status === "active" || subscription.status === "trialing";
  }

  return false;
}

async function retrieveCompletedCheckoutSession(stripe: Stripe, sessionId: string) {
  const maxAttempts = 6;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription.items.data"],
    });

    if (isCheckoutSessionComplete(session)) {
      return session;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription.items.data"],
  });
}

async function deactivatePremiumProfile(userId: string) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.rpc("deactivate_premium_subscription", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function resolveUserIdFromSubscription(subscription: Stripe.Subscription) {
  const metadataUserId = subscription.metadata.userId;
  if (metadataUserId) return metadataUserId;

  const supabase = getSupabaseServiceClient();
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.id ?? null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id ?? session.metadata?.userId;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (!userId || !subscriptionId || !customerId) {
    throw new Error("Checkout session is missing user or subscription details.");
  }

  const stripe = await getStripeClient();
  const subscription = await retrieveSubscriptionWithItems(stripe, subscriptionId);
  const { periodStart, periodEnd } = getSubscriptionBillingPeriod(subscription);

  await syncPremiumProfile({
    userId,
    customerId,
    subscriptionId,
    periodStart,
    periodEnd,
    resetUsage: true,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = await resolveUserIdFromSubscription(subscription);
  if (!userId) return;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  if (subscription.status === "active" || subscription.status === "trialing") {
    const { periodStart, periodEnd } = getSubscriptionBillingPeriod(subscription);
    await syncPremiumProfile({
      userId,
      customerId,
      subscriptionId: subscription.id,
      periodStart,
      periodEnd,
      resetUsage: false,
    });
    return;
  }

  if (subscription.status === "canceled" || subscription.status === "unpaid" || subscription.status === "incomplete_expired") {
    await deactivatePremiumProfile(userId);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (invoice.billing_reason !== "subscription_cycle") return;

  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const stripe = await getStripeClient();
  const subscription = await retrieveSubscriptionWithItems(stripe, subscriptionId);
  const userId = await resolveUserIdFromSubscription(subscription);
  if (!userId) return;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const { periodStart, periodEnd } = getSubscriptionBillingPeriod(subscription);

  await syncPremiumProfile({
    userId,
    customerId,
    subscriptionId,
    periodStart,
    periodEnd,
    resetUsage: true,
  });
}

export async function handleStripeWebhook(request: Request) {
  const stripe = await getStripeClient();
  const webhookSecret = await getStripeWebhookSecret();

  if (!webhookSecret) {
    throw new Error("Stripe webhook secret is not configured.");
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    throw new Error("Missing Stripe signature.");
  }

  const payload = await request.text();
  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

  if (await wasWebhookProcessed(event.id)) {
    return { received: true, duplicate: true };
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }

  await markWebhookProcessed(event.id, event.type);
  return { received: true, duplicate: false };
}

export async function verifyCheckoutSessionForUser(sessionId: string, userId: string) {
  const stripe = await getStripeClient();
  const session = await retrieveCompletedCheckoutSession(stripe, sessionId);

  if (!sessionBelongsToUser(session, userId)) {
    return { ok: false as const, error: "SESSION_MISMATCH" as const };
  }

  if (!isCheckoutSessionComplete(session)) {
    return { ok: false as const, error: "NOT_PAID" as const };
  }

  const subscriptionRef = session.subscription;
  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (!subscriptionId || !customerId) {
    return { ok: false as const, error: "MISSING_SUBSCRIPTION" as const };
  }

  const subscription =
    subscriptionRef && typeof subscriptionRef !== "string"
      ? subscriptionRef.items?.data?.length
        ? subscriptionRef
        : await retrieveSubscriptionWithItems(stripe, subscriptionId)
      : await retrieveSubscriptionWithItems(stripe, subscriptionId);

  const { periodStart, periodEnd } = getSubscriptionBillingPeriod(subscription);

  await syncPremiumProfile({
    userId,
    customerId,
    subscriptionId,
    periodStart,
    periodEnd,
    resetUsage: true,
  });

  return { ok: true as const, session };
}

export { PREMIUM_PLAN_ID };
