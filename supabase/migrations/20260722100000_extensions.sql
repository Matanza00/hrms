-- Extensions + shared helpers.
create extension if not exists pgcrypto with schema extensions;      -- gen_random_uuid()
create extension if not exists pg_trgm  with schema extensions;      -- fuzzy search on names/codes

-- Touch updated_at on every UPDATE. Attach per-table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
