-- Run in Supabase SQL Editor if you already applied 001_profiles.sql before defaults were added

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, google_id, name, email, profile_image, gender_pref, style_pref, mood_pref)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'sub', new.raw_user_meta_data->>'provider_id'),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'Unisex',
    'Minimal',
    'Natural'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill existing profiles that have no preferences set
update public.profiles
set
  gender_pref = coalesce(gender_pref, 'Unisex'),
  style_pref = coalesce(style_pref, 'Minimal'),
  mood_pref = coalesce(mood_pref, 'Natural')
where gender_pref is null or style_pref is null or mood_pref is null;
