-- Saved looks per user (linked to auth.users)

create table if not exists public.saved_looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occasion text not null,
  score integer not null,
  explanation text not null,
  top text not null,
  bottom text not null,
  shoes text not null,
  top_color text not null,
  bottom_color text not null,
  shoes_color text not null,
  top_color_name text,
  bottom_color_name text,
  shoes_color_name text,
  top_color_family text,
  bottom_color_family text,
  shoes_color_family text,
  created_at timestamptz not null default now()
);

create index if not exists saved_looks_user_id_idx on public.saved_looks (user_id);
create index if not exists saved_looks_created_at_idx on public.saved_looks (user_id, created_at desc);

alter table public.saved_looks enable row level security;

drop policy if exists "Users can view own saved looks" on public.saved_looks;
create policy "Users can view own saved looks"
  on public.saved_looks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own saved looks" on public.saved_looks;
create policy "Users can insert own saved looks"
  on public.saved_looks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own saved looks" on public.saved_looks;
create policy "Users can delete own saved looks"
  on public.saved_looks for delete
  using (auth.uid() = user_id);
