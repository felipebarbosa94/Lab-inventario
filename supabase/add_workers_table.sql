-- Tabla de trabajadores autorizados (lista fija para el selector de "¿Quién sos?")
create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table workers enable row level security;

drop policy if exists "workers_all_open" on workers;
create policy "workers_all_open" on workers for all using (true) with check (true);

alter publication supabase_realtime add table workers;
