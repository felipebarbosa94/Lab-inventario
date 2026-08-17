create table if not exists item_cost_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  unit_cost numeric not null,
  recorded_at timestamptz not null default now()
);

create index if not exists item_cost_history_item_id_idx on item_cost_history(item_id, recorded_at);

alter table item_cost_history enable row level security;
-- Sin políticas a propósito: solo el service role (API de Finanzas) puede leer/escribir esta tabla.
