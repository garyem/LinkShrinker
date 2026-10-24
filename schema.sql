-- Link Shrinker database setup. Paste into Supabase > SQL Editor and click Run.

create table if not exists public.links (
  code text primary key,
  url text not null,
  clicks integer not null default 0,
  created_at timestamptz not null default now()
);

-- Lock the table down. Only the server (using your secret key) can read or write.
alter table public.links enable row level security;

-- Adds one to a link's click count.
create or replace function public.increment_clicks(link_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.links set clicks = clicks + 1 where code = link_code;
$$;

revoke execute on function public.increment_clicks(text) from public, anon, authenticated;

-- Give the server (secret key) access. Needed when "Automatically expose new tables" is off.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.links to service_role;
grant execute on function public.increment_clicks(text) to service_role;
