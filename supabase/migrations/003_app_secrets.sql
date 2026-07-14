-- Server-only API secrets (never exposed to the browser).
-- Access via SUPABASE_SERVICE_ROLE_KEY on the server — RLS blocks anon/authenticated.

create table if not exists public.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;

-- No SELECT/INSERT policies for anon or authenticated roles.
-- The service_role key bypasses RLS for server-side reads/writes.

create or replace function public.set_app_secrets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_secrets_updated_at on public.app_secrets;
create trigger app_secrets_updated_at
  before update on public.app_secrets
  for each row execute function public.set_app_secrets_updated_at();
