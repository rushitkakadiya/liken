-- Color generation is unlimited for every signed-in user (no credit spend)

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
