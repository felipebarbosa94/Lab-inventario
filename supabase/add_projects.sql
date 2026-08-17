create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  lot_code text unique,
  recipe_id uuid references recipes(id) on delete set null,
  status text not null default 'en_progreso' check (status in ('en_progreso', 'completado')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists projects_status_idx on projects(status);

alter table projects enable row level security;

drop policy if exists "projects_all_open" on projects;
create policy "projects_all_open" on projects for all using (true) with check (true);
