create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,      -- "Daniela", "Dra. Bertha"
  brand text,               -- "NOU", null si no tiene marca comercial propia
  created_at timestamptz not null default now()
);

create unique index if not exists clients_name_brand_idx
  on clients (name, coalesce(brand, ''));

alter table clients enable row level security;

drop policy if exists "clients_all_open" on clients;
create policy "clients_all_open" on clients for all using (true) with check (true);
