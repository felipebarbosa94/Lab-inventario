-- Inventario Lab — esquema inicial
-- Pegar y correr esto en el SQL Editor de tu proyecto Supabase.

create extension if not exists "pgcrypto";

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- "Frasco capsulero blanco opaco"
  category text not null,                -- envase | tapa | scoop | bolsa_proteina | otro
  project text,                          -- "Daniela" | "Rafas" | null
  flavor text,                           -- sabor, solo aplica a bolsas de proteína
  unit text not null check (unit in ('kg', 'g', 'unidad')),
  quantity numeric not null default 0,
  low_stock_threshold numeric,           -- si quantity <= esto, dispara alerta KPI
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  user_name text not null,               -- quién hizo el movimiento
  type text not null check (type in ('entrada', 'salida', 'ajuste')),
  quantity numeric not null,             -- siempre positivo; el signo lo da "type"
  note text,
  created_at timestamptz not null default now()
);

create index if not exists movements_item_id_idx on movements(item_id);
create index if not exists movements_created_at_idx on movements(created_at desc);

-- Mantiene items.quantity sincronizado cada vez que se inserta un movimiento
create or replace function apply_movement() returns trigger as $$
begin
  if new.type = 'entrada' then
    update items set quantity = quantity + new.quantity, updated_at = now() where id = new.item_id;
  elsif new.type = 'salida' then
    update items set quantity = greatest(quantity - new.quantity, 0), updated_at = now() where id = new.item_id;
  elsif new.type = 'ajuste' then
    update items set quantity = new.quantity, updated_at = now() where id = new.item_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_apply_movement on movements;
create trigger trg_apply_movement
  after insert on movements
  for each row execute function apply_movement();

-- RLS: abierto para empezar (app interna, sin login todavía).
-- Cuando agreguemos auth de trabajadores, esto se reemplaza por policies reales.
alter table items enable row level security;
alter table movements enable row level security;

drop policy if exists "items_all_open" on items;
drop policy if exists "movements_all_open" on movements;
create policy "items_all_open" on items for all using (true) with check (true);
create policy "movements_all_open" on movements for all using (true) with check (true);

-- Habilita Realtime en ambas tablas (ignorá el error si ya estaban agregadas)
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table movements;
