-- Stripe billing (safe / additive only — no DROP or REVOKE)
-- Run this entire script in Supabase SQL Editor.

-- 1) Plan pricing table
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'usd',
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  product_suggestions_limit integer not null default 15,
  try_ons_limit integer not null default 15,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.subscription_plans (
  id,
  name,
  price_cents,
  currency,
  billing_interval,
  product_suggestions_limit,
  try_ons_limit,
  active
)
values (
  'premium_monthly',
  'Premium Monthly',
  1000,
  'usd',
  'month',
  15,
  15,
  true
)
on conflict (id) do update
set
  name = excluded.name,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  billing_interval = excluded.billing_interval,
  product_suggestions_limit = excluded.product_suggestions_limit,
  try_ons_limit = excluded.try_ons_limit,
  active = excluded.active,
  updated_at = now();

alter table public.subscription_plans enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'subscription_plans'
      and policyname = 'Anyone can read active subscription plans'
  ) then
    create policy "Anyone can read active subscription plans"
      on public.subscription_plans
      for select
      using (active = true);
  end if;
end $$;

-- 2) Stripe fields on profiles
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- 3) Webhook idempotency table
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- 4) Block fake in-app premium activation (Stripe checkout only)
create or replace function public.activate_premium_subscription()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'USE_STRIPE_CHECKOUT';
end;
$$;

-- 5) Server/webhook-only premium sync (not granted to authenticated)
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'sync_premium_from_stripe'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, text, text, timestamptz, timestamptz, boolean'
  ) then
    create function public.sync_premium_from_stripe(
      p_user_id uuid,
      p_stripe_customer_id text,
      p_stripe_subscription_id text,
      p_period_start timestamptz,
      p_period_end timestamptz,
      p_reset_usage boolean default true
    )
    returns public.profiles
    language plpgsql
    security definer
    set search_path = public
    as $function$
    declare
      p public.profiles;
    begin
      update public.profiles
      set
        plan = 'Premium',
        stripe_customer_id = p_stripe_customer_id,
        stripe_subscription_id = p_stripe_subscription_id,
        premium_started_at = coalesce(premium_started_at, p_period_start),
        premium_expires_at = p_period_end,
        product_suggestions_used = case when p_reset_usage then 0 else product_suggestions_used end,
        try_ons_used = case when p_reset_usage then 0 else try_ons_used end
      where id = p_user_id
      returning * into p;

      if p is null then
        raise exception 'PROFILE_NOT_FOUND';
      end if;

      return p;
    end;
    $function$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'deactivate_premium_subscription'
      and pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) then
    create function public.deactivate_premium_subscription(p_user_id uuid)
    returns public.profiles
    language plpgsql
    security definer
    set search_path = public
    as $function$
    declare
      p public.profiles;
    begin
      update public.profiles
      set
        plan = 'Free',
        stripe_subscription_id = null,
        premium_started_at = null,
        premium_expires_at = null
      where id = p_user_id
      returning * into p;

      if p is null then
        raise exception 'PROFILE_NOT_FOUND';
      end if;

      return p;
    end;
    $function$;
  end if;
end $$;
