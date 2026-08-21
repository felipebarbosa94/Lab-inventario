-- Lotes múltiples por ítem — permite tener varias entradas del mismo
-- principio activo, cada una con su propio número de lote, caducidad,
-- proveedor y cantidad restante, sin perder ni sobreescribir nada.
-- items.quantity sigue siendo el total real (ya sincronizado por el
-- trigger de movimientos que ya existe); item_lots es el desglose por lote.

create table if not exists item_lots (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  lote text,
  caducidad date,
  proveedor text,
  quantity numeric not null default 0,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists item_lots_item_id_idx on item_lots(item_id);
create index if not exists item_lots_caducidad_idx on item_lots(caducidad);

alter table item_lots enable row level security;
drop policy if exists "item_lots_all_open" on item_lots;
create policy "item_lots_all_open" on item_lots for all using (true) with check (true);

-- Cada movimiento puede apuntar al lote específico que afectó, para
-- trazabilidad exacta de qué lote entró o salió.
alter table movements add column if not exists lot_id uuid references item_lots(id);

-- Backfill: un lote inicial por ítem a partir de lo que ya había guardado
-- (lote/caducidad/proveedor/cantidad actuales), para no perder nada de lo
-- que ya existía. Si un ítem no tenía lote/caducidad, igual se le crea un
-- lote "sin datos" con su cantidad actual, para que la suma de lotes
-- siempre cuadre con items.quantity desde el día uno. Es seguro correr esto
-- más de una vez: solo inserta para ítems que todavía no tienen ningún lote.
insert into item_lots (item_id, lote, caducidad, proveedor, quantity, received_at)
select id, lote, caducidad, proveedor, quantity, updated_at
from items
where not exists (select 1 from item_lots where item_lots.item_id = items.id);
