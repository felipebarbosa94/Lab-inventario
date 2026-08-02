-- Reset completo: borra las tablas de este proyecto (items, movements) y las
-- vuelve a crear desde cero. Pegá TODO este archivo en una query nueva del
-- SQL Editor de Supabase y dale Run una sola vez.

drop table if exists movements cascade;
drop table if exists items cascade;

create extension if not exists "pgcrypto";

create table items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  project text,
  flavor text,
  unit text not null check (unit in ('kg', 'g', 'unidad')),
  quantity numeric not null default 0,
  low_stock_threshold numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  user_name text not null,
  type text not null check (type in ('entrada', 'salida', 'ajuste')),
  quantity numeric not null,
  note text,
  created_at timestamptz not null default now()
);

create index movements_item_id_idx on movements(item_id);
create index movements_created_at_idx on movements(created_at desc);

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

create trigger trg_apply_movement
  after insert on movements
  for each row execute function apply_movement();

alter table items enable row level security;
alter table movements enable row level security;

create policy "items_all_open" on items for all using (true) with check (true);
create policy "movements_all_open" on movements for all using (true) with check (true);

-- Si esto tira error de "already member of publication", ignoralo — ya estaba habilitado.
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table movements;
