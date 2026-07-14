-- Subscription period, usage counters, and looks_generated for dashboard stats

alter table public.profiles
  add column if not exists looks_generated integer not null default 0,
  add column if not exists premium_started_at timestamptz,
  add column if not exists premium_expires_at timestamptz,
  add column if not exists product_suggestions_used integer not null default 0,
  add column if not exists try_ons_used integer not null default 0;

-- Activate a 1-month Premium subscription ($10 plan — payment is simulated in-app)
create or replace function public.activate_premium_subscription()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  update public.profiles
  set
    plan = 'Premium',
    premium_started_at = now(),
    premium_expires_at = now() + interval '1 month',
    product_suggestions_used = 0,
    try_ons_used = 0
  where id = auth.uid()
  returning * into p;

  if p is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  return p;
end;
$$;

-- Record a color generation: increments looks_generated only (unlimited for all users)
create or replace function public.record_look_generated()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  update public.profiles
  set looks_generated = looks_generated + 1
  where id = auth.uid()
  returning * into p;

  if p is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  return p;
end;
$$;

-- Consume one product-suggestion use (Premium only, max 15 per subscription month)
create or replace function public.consume_product_suggestion()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select * into p from public.profiles where id = auth.uid() for update;
  if p is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if p.plan <> 'Premium' or p.premium_expires_at is null or p.premium_expires_at <= now() then
    if p.plan = 'Premium' then
      update public.profiles
      set plan = 'Free', premium_started_at = null, premium_expires_at = null
      where id = auth.uid();
    end if;
    raise exception 'PREMIUM_REQUIRED';
  end if;

  if p.product_suggestions_used >= 15 then
    raise exception 'PRODUCT_LIMIT_REACHED';
  end if;

  update public.profiles
  set product_suggestions_used = product_suggestions_used + 1
  where id = auth.uid()
  returning * into p;

  return p;
end;
$$;

-- Consume one AI try-on use (Premium only, max 15 per subscription month)
create or replace function public.consume_try_on()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select * into p from public.profiles where id = auth.uid() for update;
  if p is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if p.plan <> 'Premium' or p.premium_expires_at is null or p.premium_expires_at <= now() then
    if p.plan = 'Premium' then
      update public.profiles
      set plan = 'Free', premium_started_at = null, premium_expires_at = null
      where id = auth.uid();
    end if;
    raise exception 'PREMIUM_REQUIRED';
  end if;

  if p.try_ons_used >= 15 then
    raise exception 'TRYON_LIMIT_REACHED';
  end if;

  update public.profiles
  set try_ons_used = try_ons_used + 1
  where id = auth.uid()
  returning * into p;

  return p;
end;
$$;

grant execute on function public.activate_premium_subscription() to authenticated;
grant execute on function public.record_look_generated() to authenticated;
grant execute on function public.consume_product_suggestion() to authenticated;
grant execute on function public.consume_try_on() to authenticated;
